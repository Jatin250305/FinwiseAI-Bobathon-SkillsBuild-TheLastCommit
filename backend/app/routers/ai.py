from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction, Loan, Goal, AIConversation, LoanApplication, EducationLoan
from app.schemas.ai import AIChatRequest, AIChatResponse, ConversationOut
from app.services.ai_chat import get_ai_response
from app.services.finance import (
    calculate_emi,
    compute_monthly_income,
    compute_monthly_expenses,
    compute_monthly_savings,
    compute_financial_health_score,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def _prev_month(ym: str) -> str:
    year, month = int(ym[:4]), int(ym[5:7])
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.message.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty")
    if len(body.message) > 2000:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message too long")

    # ── Build rich financial context scoped strictly to this user ────────────
    m = datetime.now(timezone.utc).strftime("%Y-%m")
    prev = _prev_month(m)

    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    loans = db.query(Loan).filter(Loan.user_id == current_user.id, Loan.status == "active").all()
    goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.status == "active").all()

    # Monthly totals — current and previous
    monthly_income = compute_monthly_income(txns, m)
    monthly_expenses = compute_monthly_expenses(txns, m)
    monthly_savings = compute_monthly_savings(txns, m)
    prev_income = compute_monthly_income(txns, prev)
    prev_expenses = compute_monthly_expenses(txns, prev)

    # Cumulative savings
    current_savings = sum(t.amount for t in txns if t.type == "savings")

    # EMI
    total_emi = sum(calculate_emi(l.principal_amount, l.interest_rate, l.tenure_months) for l in loans)

    # Health score
    health = compute_financial_health_score(monthly_income, monthly_expenses, monthly_savings, total_emi, goals, [])

    # Category breakdown (this month — expense + loan types only)
    cat_totals: dict = {}
    for t in txns:
        if t.date[:7] == m and t.type in ("expense", "loan"):
            cat_totals[t.category] = cat_totals.get(t.category, 0.0) + t.amount
    top_categories = dict(sorted(cat_totals.items(), key=lambda x: -x[1])[:6])

    # Largest expense this month
    month_expenses = [t for t in txns if t.date[:7] == m and t.type in ("expense", "loan")]
    largest_expense = max((t.amount for t in month_expenses), default=0.0)
    largest_expense_desc = next(
        (t.description for t in month_expenses if t.amount == largest_expense), ""
    )

    # Recent 5 transactions (newest first)
    recent = sorted(txns, key=lambda t: (t.date, t.created_at), reverse=True)[:5]
    recent_txns = [
        {"description": t.description, "amount": t.amount, "type": t.type, "date": t.date}
        for t in recent
    ]

    # Goals progress
    goals_summary = [
        {
            "name": g.name,
            "target": g.target_amount,
            "current": g.current_amount,
            "pct": round(min(100, g.current_amount / g.target_amount * 100) if g.target_amount else 0),
        }
        for g in goals
    ]

    # Education loan context (scoped to this user only)
    edu_apps = db.query(LoanApplication).filter(
        LoanApplication.student_user_id == current_user.id
    ).order_by(LoanApplication.submitted_at.desc()).limit(5).all()
    edu_loans = db.query(EducationLoan).filter(
        EducationLoan.student_user_id == current_user.id
    ).order_by(EducationLoan.created_at.desc()).limit(5).all()

    edu_apps_summary = [
        {
            "application_id": a.application_id,
            "status": a.status,
            "requested_amount": a.requested_amount,
            "institution": a.institution,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        }
        for a in edu_apps
    ]
    edu_loans_summary = [
        {
            "loan_id": l.loan_id,
            "approved_amount": l.approved_amount,
            "status": l.status,
            "disbursed_at": l.disbursed_at.isoformat() if l.disbursed_at else None,
            "approved_at": l.approved_at.isoformat() if l.approved_at else None,
        }
        for l in edu_loans
    ]

    financial_context = {
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "monthly_savings": monthly_savings,
        "prev_month_income": prev_income,
        "prev_month_expenses": prev_expenses,
        "current_savings": current_savings,
        "emi": total_emi,
        "health_score": health["overall"],
        "category_breakdown": top_categories,
        "largest_expense": largest_expense,
        "largest_expense_description": largest_expense_desc,
        "recent_transactions": recent_txns,
        "savings_goals": goals_summary,
        "user_name": current_user.name,
        "education_loan_applications": edu_apps_summary,
        "education_loans": edu_loans_summary,
    }

    result = await get_ai_response(body.message, financial_context)
    return AIChatResponse(**result)


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convs = (
        db.query(AIConversation)
        .filter(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.updated_at.desc())
        .all()
    )
    return [
        ConversationOut(
            id=c.id,
            title=c.title,
            createdAt=c.created_at.isoformat(),
            updatedAt=c.updated_at.isoformat(),
        )
        for c in convs
    ]


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(AIConversation).filter(
        AIConversation.id == conversation_id,
        AIConversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    db.delete(conv)
    db.commit()
