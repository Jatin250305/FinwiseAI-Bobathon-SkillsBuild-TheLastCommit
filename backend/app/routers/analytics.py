from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction, Loan, Goal
from app.schemas.analytics import (
    AnalyticsSummaryOut, CategoryBreakdownOut, MonthlyTrendPointOut, AIInsightOut
)
from app.services.finance import (
    calculate_emi,
    compute_monthly_income,
    compute_monthly_expenses,
    compute_monthly_savings,
)
import uuid

router = APIRouter(prefix="/analytics", tags=["analytics"])

MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


def _month_label(ym: str) -> str:
    """YYYY-MM → 'Jan'"""
    try:
        return MONTH_NAMES[int(ym[5:7]) - 1]
    except Exception:
        return ym


def _prev_month(ym: str) -> str:
    year, month = int(ym[:4]), int(ym[5:7])
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"


@router.get("/summary", response_model=AnalyticsSummaryOut)
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = datetime.now(timezone.utc).strftime("%Y-%m")
    prev = _prev_month(m)
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    cur_income = compute_monthly_income(txns, m)
    prev_income = compute_monthly_income(txns, prev)
    cur_exp = compute_monthly_expenses(txns, m)
    prev_exp = compute_monthly_expenses(txns, prev)

    income_change = round(((cur_income - prev_income) / prev_income * 100) if prev_income else 0, 1)
    # Negative expenses change = went down = good
    expenses_change = round(-((cur_exp - prev_exp) / prev_exp * 100) if prev_exp else 0, 1)

    return AnalyticsSummaryOut(
        currentMonthIncome=round(cur_income, 2),
        previousMonthIncome=round(prev_income, 2),
        incomeChange=income_change,
        currentMonthExpenses=round(cur_exp, 2),
        previousMonthExpenses=round(prev_exp, 2),
        expensesChange=expenses_change,
    )


@router.get("/categories", response_model=List[CategoryBreakdownOut])
def analytics_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = datetime.now(timezone.utc).strftime("%Y-%m")
    prev = _prev_month(m)
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    cur_by_cat: dict = {}
    prev_by_cat: dict = {}
    for t in txns:
        if t.type not in ("expense", "loan"):
            continue
        if t.date[:7] == m:
            cur_by_cat[t.category] = cur_by_cat.get(t.category, 0.0) + t.amount
        elif t.date[:7] == prev:
            prev_by_cat[t.category] = prev_by_cat.get(t.category, 0.0) + t.amount

    total = sum(cur_by_cat.values()) or 1.0
    result = []
    for cat, amt in sorted(cur_by_cat.items(), key=lambda x: -x[1]):
        result.append(CategoryBreakdownOut(
            category=cat,
            amount=round(amt, 2),
            percentage=round((amt / total) * 100, 1),
            previousAmount=round(prev_by_cat.get(cat, 0.0), 2),
        ))
    return result


@router.get("/trend", response_model=List[MonthlyTrendPointOut])
def analytics_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    now = datetime.now(timezone.utc)

    # Last 6 months including current
    months = []
    year, month = now.year, now.month
    for _ in range(6):
        months.append(f"{year}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    months.reverse()

    result = []
    for ym in months:
        result.append(MonthlyTrendPointOut(
            month=_month_label(ym),
            income=round(compute_monthly_income(txns, ym), 2),
            expenses=round(compute_monthly_expenses(txns, ym), 2),
            savings=round(compute_monthly_savings(txns, ym), 2),
        ))
    return result


@router.get("/insights", response_model=List[AIInsightOut])
def analytics_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = datetime.now(timezone.utc).strftime("%Y-%m")
    prev = _prev_month(m)
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    now_iso = datetime.now(timezone.utc).isoformat()

    cur_exp = compute_monthly_expenses(txns, m)
    prev_exp = compute_monthly_expenses(txns, prev)
    cur_income = compute_monthly_income(txns, m)
    cur_savings = compute_monthly_savings(txns, m)

    insights = []

    if prev_exp > 0 and cur_exp > prev_exp * 1.1:
        pct = round((cur_exp - prev_exp) / prev_exp * 100)
        insights.append(AIInsightOut(
            id=str(uuid.uuid4()),
            type="warning",
            title="Expenses Increased",
            message=f"Your expenses increased by {pct}% compared to last month.",
            generatedAt=now_iso,
        ))

    if cur_income > 0:
        rate = cur_savings / cur_income * 100
        if rate >= 20:
            insights.append(AIInsightOut(
                id=str(uuid.uuid4()),
                type="saving_insight",
                title="Strong Savings Rate",
                message=f"Your savings rate is {rate:.0f}% this month — above the recommended 20%.",
                generatedAt=now_iso,
            ))
        elif rate < 10:
            insights.append(AIInsightOut(
                id=str(uuid.uuid4()),
                type="recommendation",
                title="Low Savings Rate",
                message=f"Your savings rate is only {rate:.0f}% this month. Try to save at least 20% of your income.",
                generatedAt=now_iso,
            ))

    # Category spike
    cur_by_cat: dict = {}
    prev_by_cat: dict = {}
    for t in txns:
        if t.type not in ("expense",):
            continue
        if t.date[:7] == m:
            cur_by_cat[t.category] = cur_by_cat.get(t.category, 0.0) + t.amount
        elif t.date[:7] == prev:
            prev_by_cat[t.category] = prev_by_cat.get(t.category, 0.0) + t.amount

    for cat, amt in cur_by_cat.items():
        prev_amt = prev_by_cat.get(cat, 0.0)
        if prev_amt > 0 and amt > prev_amt * 1.3:
            pct = round((amt - prev_amt) / prev_amt * 100)
            insights.append(AIInsightOut(
                id=str(uuid.uuid4()),
                type="spending_insight",
                title=f"{cat.title()} Spending Up",
                message=f"Your {cat} expenses increased by {pct}% compared to last month.",
                generatedAt=now_iso,
            ))
            break  # one spike insight max

    if not insights:
        insights.append(AIInsightOut(
            id=str(uuid.uuid4()),
            type="recommendation",
            title="On Track",
            message="Your spending is within normal range this month. Keep it up!",
            generatedAt=now_iso,
        ))

    return insights[:4]
