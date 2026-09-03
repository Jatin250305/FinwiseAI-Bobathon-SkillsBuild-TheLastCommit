from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction, Loan, Goal, AffordabilityRecord
from app.schemas.affordability import (
    AffordabilityCheckRequest, AffordabilityResultOut, AffordabilityRecordOut
)
from app.services.finance import (
    calculate_emi,
    compute_monthly_expenses,
    compute_monthly_savings,
    compute_monthly_income,
    compute_affordability,
)

router = APIRouter(prefix="/affordability", tags=["affordability"])


def _record_to_out(r: AffordabilityRecord) -> AffordabilityRecordOut:
    return AffordabilityRecordOut(
        id=r.id,
        itemName=r.item_name,
        itemPrice=r.item_price,
        category=r.category,
        isRecurring=r.is_recurring,
        date=r.date,
        recommendation=r.recommendation,
        result=AffordabilityResultOut(
            recommendation=r.recommendation,
            itemPrice=r.item_price,
            availableBalance=r.available_balance,
            expectedMonthlyExpenses=r.expected_monthly_expenses,
            upcomingObligations=r.upcoming_obligations,
            savingsGoalContribution=r.savings_goal_contribution,
            estimatedDisposableAmount=r.estimated_disposable_amount,
            aiExplanation=r.ai_explanation,
        ),
    )


@router.post("/check", response_model=AffordabilityResultOut)
def check_affordability(
    body: AffordabilityCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = datetime.now(timezone.utc).strftime("%Y-%m")
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    loans = db.query(Loan).filter(Loan.user_id == current_user.id, Loan.status == "active").all()
    goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.status == "active").all()

    monthly_income = compute_monthly_income(txns, m)
    monthly_expenses = compute_monthly_expenses(txns, m)
    monthly_savings = compute_monthly_savings(txns, m)
    total_emi = sum(calculate_emi(l.principal_amount, l.interest_rate, l.tenure_months) for l in loans)
    goal_contribution = sum(g.monthly_contribution for g in goals)
    available_balance = monthly_income - monthly_expenses

    result = compute_affordability(
        item_price=body.itemPrice,
        available_balance=available_balance,
        monthly_expenses=monthly_expenses,
        active_emi=total_emi,
        monthly_goal_contribution=goal_contribution,
        monthly_income=monthly_income,
        item_name=body.itemName,
        category=body.category,
    )

    # Persist record
    record = AffordabilityRecord(
        user_id=current_user.id,
        item_name=body.itemName,
        item_price=body.itemPrice,
        category=body.category,
        is_recurring=body.isRecurring,
        recommendation=result["recommendation"],
        available_balance=result["availableBalance"],
        expected_monthly_expenses=result["expectedMonthlyExpenses"],
        upcoming_obligations=result["upcomingObligations"],
        savings_goal_contribution=result["savingsGoalContribution"],
        estimated_disposable_amount=result["estimatedDisposableAmount"],
        ai_explanation=result["aiExplanation"],
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    )
    db.add(record)
    db.commit()

    return AffordabilityResultOut(**result)


@router.get("/history", response_model=List[AffordabilityRecordOut])
def affordability_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(AffordabilityRecord)
        .filter(AffordabilityRecord.user_id == current_user.id)
        .order_by(AffordabilityRecord.created_at.desc())
        .all()
    )
    return [_record_to_out(r) for r in records]
