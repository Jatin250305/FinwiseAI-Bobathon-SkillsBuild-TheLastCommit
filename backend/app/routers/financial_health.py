from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction, Loan, Goal
from app.schemas.financial_health import FinancialHealthOut, HealthMetricOut
from app.services.finance import (
    calculate_emi,
    compute_monthly_income,
    compute_monthly_expenses,
    compute_monthly_savings,
    compute_financial_health_score,
    derive_budget_status,
    compute_spent_for_budget,
)
from app.models import Budget

router = APIRouter(tags=["financial-health"])


@router.get("/financial-health", response_model=FinancialHealthOut)
def financial_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = datetime.now(timezone.utc).strftime("%Y-%m")
    prev_year = int(m[:4])
    prev_month = int(m[5:7]) - 1
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1
    prev_m = f"{prev_year}-{prev_month:02d}"

    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    loans = db.query(Loan).filter(Loan.user_id == current_user.id, Loan.status == "active").all()
    goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.status == "active").all()
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == m).all()

    monthly_income = compute_monthly_income(txns, m)
    monthly_expenses = compute_monthly_expenses(txns, m)
    monthly_savings = compute_monthly_savings(txns, m)
    total_emi = sum(calculate_emi(l.principal_amount, l.interest_rate, l.tenure_months) for l in loans)

    # Budget status list for adherence metric
    budgets_status = []
    for b in budgets:
        spent = compute_spent_for_budget(txns, b.category, b.month)
        budgets_status.append({"status": derive_budget_status(spent, b.budget_amount)})

    result = compute_financial_health_score(
        monthly_income, monthly_expenses, monthly_savings, total_emi, goals, budgets_status
    )

    # Previous month score (simplified — use same formula with prev month data)
    prev_income = compute_monthly_income(txns, prev_m)
    prev_expenses = compute_monthly_expenses(txns, prev_m)
    prev_savings = compute_monthly_savings(txns, prev_m)
    prev_result = compute_financial_health_score(prev_income, prev_expenses, prev_savings, total_emi, goals, [])
    prev_score = prev_result["overall"]

    score_change = round(result["overall"] - prev_score, 1)

    # Build AI explanation
    savings_rate = round(monthly_savings / monthly_income * 100, 1) if monthly_income else 0
    emi_ratio = round(total_emi / monthly_income * 100, 1) if monthly_income else 0

    if score_change > 0:
        explanation = (
            f"Your financial health score improved by {abs(score_change)} points this month. "
            f"Your savings rate of {savings_rate}% is {'above' if savings_rate >= 20 else 'below'} the 20% target. "
            f"Your EMI-to-income ratio is {emi_ratio}%."
        )
    elif score_change < 0:
        explanation = (
            f"Your financial health score decreased by {abs(score_change)} points. "
            f"Review your spending categories and ensure you're staying within budget. "
            f"Your current savings rate is {savings_rate}%."
        )
    else:
        explanation = (
            f"Your financial health score is stable this month. "
            f"Savings rate: {savings_rate}%. EMI burden: {emi_ratio}% of income."
        )

    metrics = {
        k: HealthMetricOut(
            label=v["label"],
            score=v["score"],
            weight=v["weight"],
            description=v["description"],
        )
        for k, v in result["metrics"].items()
    }

    return FinancialHealthOut(
        overallScore=result["overall"],
        previousScore=round(prev_score, 1),
        scoreChange=score_change,
        metrics=metrics,
        aiExplanation=explanation,
        generatedAt=datetime.now(timezone.utc).isoformat(),
    )
