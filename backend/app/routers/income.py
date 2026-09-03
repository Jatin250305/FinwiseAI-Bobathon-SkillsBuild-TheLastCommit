from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction, Goal, Loan, IncomeSource, Budget
from app.schemas.income import (
    IncomeSummaryOut, DashboardSummaryOut, IncomeSourceOut,
    CreateIncomeSourceRequest, UpdateIncomeSourceRequest,
)
from app.services.finance import (
    calculate_emi,
    compute_monthly_income,
    compute_monthly_expenses,
    compute_monthly_savings,
    compute_financial_health_score,
    derive_budget_status,
    compute_spent_for_budget,
)
from datetime import datetime, timezone

router = APIRouter(tags=["income"])


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


@router.get("/income/summary", response_model=IncomeSummaryOut)
def income_summary(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = month or _current_month()
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    monthly_income = compute_monthly_income(txns, m)
    essential_exp = sum(
        t.amount for t in txns
        if t.date[:7] == m and t.type in ("expense", "loan")
        and t.category in ("education", "accommodation", "healthcare", "utilities", "transportation")
    )
    discretionary_exp = sum(
        t.amount for t in txns
        if t.date[:7] == m and t.type == "expense"
        and t.category in ("food", "shopping", "entertainment", "personal", "other")
    )
    savings = compute_monthly_savings(txns, m)
    remaining = monthly_income - essential_exp - discretionary_exp - savings

    sources = db.query(IncomeSource).filter(
        IncomeSource.user_id == current_user.id,
        IncomeSource.month == m,
    ).all()

    return IncomeSummaryOut(
        monthlyIncome=round(monthly_income, 2),
        essentialExpenses=round(essential_exp, 2),
        discretionaryExpenses=round(discretionary_exp, 2),
        savings=round(savings, 2),
        remaining=round(remaining, 2),
        incomeSources=[
            IncomeSourceOut(id=s.id, type=s.type, label=s.label, amount=s.amount, month=s.month)
            for s in sources
        ],
    )


@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = _current_month()
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    monthly_income = compute_monthly_income(txns, m)
    total_expenses = compute_monthly_expenses(txns, m)
    monthly_savings = compute_monthly_savings(txns, m)
    remaining_balance = monthly_income - total_expenses

    # Current savings = cumulative savings transactions across all time
    current_savings = sum(t.amount for t in txns if t.type == "savings")

    loans = db.query(Loan).filter(Loan.user_id == current_user.id, Loan.status == "active").all()
    active_loans = len(loans)
    total_emi = sum(calculate_emi(l.principal_amount, l.interest_rate, l.tenure_months) for l in loans)

    goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.status == "active").all()

    # Overall goal progress
    if goals:
        progresses = [min(1.0, g.current_amount / g.target_amount) for g in goals if g.target_amount > 0]
        goal_progress = round((sum(progresses) / len(progresses)) * 100) if progresses else 0
    else:
        goal_progress = 0

    # Budget status — identical logic to GET /financial-health so scores always match
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == m).all()
    budgets_status = []
    for b in budgets:
        spent = compute_spent_for_budget(txns, b.category, b.month)
        budgets_status.append({"status": derive_budget_status(spent, b.budget_amount)})

    # Health score — identical inputs to GET /financial-health
    health = compute_financial_health_score(monthly_income, total_expenses, monthly_savings, total_emi, goals, budgets_status)
    health_score = health["overall"]

    return DashboardSummaryOut(
        monthlyIncome=round(monthly_income, 2),
        totalExpenses=round(total_expenses, 2),
        remainingBalance=round(remaining_balance, 2),
        currentSavings=round(current_savings, 2),
        activeLoans=active_loans,
        savingsGoalProgress=goal_progress,
        financialHealthScore=health_score,
        userName=current_user.name,
    )


@router.post("/income/sources", response_model=IncomeSourceOut, status_code=status.HTTP_201_CREATED)
def create_income_source(
    body: CreateIncomeSourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = IncomeSource(
        user_id=current_user.id,
        type=body.type,
        label=body.label,
        amount=body.amount,
        month=body.month,
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return IncomeSourceOut(id=src.id, type=src.type, label=src.label, amount=src.amount, month=src.month)


@router.put("/income/sources/{source_id}", response_model=IncomeSourceOut)
def update_income_source(
    source_id: str,
    body: UpdateIncomeSourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = db.query(IncomeSource).filter(
        IncomeSource.id == source_id,
        IncomeSource.user_id == current_user.id,
    ).first()
    if not src:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income source not found")
    if body.type is not None:
        src.type = body.type
    if body.label is not None:
        src.label = body.label
    if body.amount is not None:
        src.amount = body.amount
    db.commit()
    db.refresh(src)
    return IncomeSourceOut(id=src.id, type=src.type, label=src.label, amount=src.amount, month=src.month)


@router.delete("/income/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = db.query(IncomeSource).filter(
        IncomeSource.id == source_id,
        IncomeSource.user_id == current_user.id,
    ).first()
    if not src:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income source not found")
    db.delete(src)
    db.commit()
