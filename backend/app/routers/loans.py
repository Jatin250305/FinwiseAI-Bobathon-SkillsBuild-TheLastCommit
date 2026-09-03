from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Loan, Transaction
from app.schemas.loan import LoanOut, CreateLoanRequest, LoanUsageOut, LoanUsageBreakdownOut
from app.services.finance import calculate_emi, calculate_total_repayment, calculate_total_interest

router = APIRouter(prefix="/loans", tags=["loans"])


def _to_out(loan: Loan, all_txns: list) -> LoanOut:
    emi = calculate_emi(loan.principal_amount, loan.interest_rate, loan.tenure_months)
    total_repayment = calculate_total_repayment(emi, loan.tenure_months)
    total_interest = calculate_total_interest(loan.principal_amount, total_repayment)
    # Amount used = sum of loan-type transactions for this loan
    amount_used = sum(t.amount for t in all_txns if t.loan_id == loan.id and t.type in ("loan", "expense"))
    remaining = max(0.0, loan.principal_amount - amount_used)
    return LoanOut(
        id=loan.id,
        name=loan.name,
        principalAmount=loan.principal_amount,
        amountUsed=round(amount_used, 2),
        remainingLoan=round(remaining, 2),
        interestRate=loan.interest_rate,
        tenureMonths=loan.tenure_months,
        emi=emi,
        totalRepayment=total_repayment,
        totalInterest=total_interest,
        loanStartDate=loan.loan_start_date,
        repaymentStartDate=loan.repayment_start_date,
        status=loan.status,
    )


@router.get("", response_model=List[LoanOut])
def list_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loans = db.query(Loan).filter(Loan.user_id == current_user.id).all()
    all_txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    return [_to_out(l, all_txns) for l in loans]


@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(
    loan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")
    all_txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    return _to_out(loan, all_txns)


@router.post("", response_model=LoanOut, status_code=status.HTTP_201_CREATED)
def create_loan(
    body: CreateLoanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = Loan(
        user_id=current_user.id,
        name=body.name,
        principal_amount=body.principalAmount,
        interest_rate=body.interestRate,
        tenure_months=body.tenureMonths,
        loan_start_date=body.loanStartDate,
        repayment_start_date=body.repaymentStartDate,
        status="active",
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return _to_out(loan, [])


@router.get("/{loan_id}/usage", response_model=LoanUsageOut)
def get_loan_usage(
    loan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    # Loan transactions grouped by category
    txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.loan_id == loan_id,
    ).all()

    category_totals: dict = {}
    for t in txns:
        label = t.category.replace("_", " ").title()
        category_totals[label] = category_totals.get(label, 0.0) + t.amount

    total_used = sum(category_totals.values())

    breakdown = []
    for cat, amt in sorted(category_totals.items(), key=lambda x: -x[1]):
        pct = round((amt / total_used) * 100, 2) if total_used > 0 else 0.0
        breakdown.append(LoanUsageBreakdownOut(category=cat, amount=round(amt, 2), percentage=pct))

    top_cat = breakdown[0].category if breakdown else "Education"
    top_pct = breakdown[0].percentage if breakdown else 0
    explanation = (
        f"Your education loan has been used primarily for {top_cat} ({top_pct:.0f}%). "
        f"A total of ₹{total_used:,.0f} has been disbursed across {len(breakdown)} categories."
    )

    return LoanUsageOut(
        loanId=loan_id,
        totalUsed=round(total_used, 2),
        breakdown=breakdown,
        aiExplanation=explanation,
    )
