"""
Transactions router.

Every successful POST also:
 1. Creates a Notification for the user summarising what was recorded.
 2. Checks whether any budget for this category is now near-limit or exceeded
    and creates a budget-alert Notification if so.

All notification logic runs inside the same DB commit as the transaction itself
so they are always consistent.
"""
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction, Notification, Budget
from app.schemas.transaction import TransactionOut, CreateTransactionRequest
from app.services.finance import compute_spent_for_budget, derive_budget_status

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _to_out(t: Transaction) -> TransactionOut:
    return TransactionOut(
        id=t.id,
        date=t.date,
        description=t.description,
        category=t.category,
        amount=t.amount,
        type=t.type,
        paymentMethod=t.payment_method,
        source=t.source,
        loanId=t.loan_id,
        scholarshipId=t.scholarship_id,
        notes=t.notes,
    )


def _build_transaction_notification(t: Transaction, user_id: str) -> Notification:
    """Return a Notification describing the recorded transaction."""
    tx_type = t.type
    amt = f"₹{t.amount:,.0f}"
    if tx_type in ("income", "scholarship"):
        title = "Income recorded"
        msg = f"+{amt} received — {t.description}"
        notif_type = "transaction"
    elif tx_type == "savings":
        title = "Savings recorded"
        msg = f"{amt} moved to savings — {t.description}"
        notif_type = "transaction"
    elif tx_type in ("expense", "loan"):
        title = "Expense recorded"
        msg = f"{amt} spent on {t.description} ({t.category})"
        notif_type = "transaction"
    else:
        title = "Transaction recorded"
        msg = f"{amt} — {t.description}"
        notif_type = "transaction"

    return Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=msg,
        transaction_id=t.id,
    )


def _check_budget_alert(
    t: Transaction,
    user_id: str,
    db: Session,
) -> Optional[Notification]:
    """
    After recording an expense, look up any budget for this category/month.
    If now near-limit (≥80%) or exceeded, return a budget-alert Notification.
    Returns None if no budget exists or threshold not hit.
    """
    if t.type not in ("expense", "loan"):
        return None

    month = t.date[:7]  # YYYY-MM
    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category == t.category,
        Budget.month == month,
    ).first()
    if not budget or budget.budget_amount <= 0:
        return None

    # Compute total spent including the just-added transaction
    all_txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    spent = compute_spent_for_budget(all_txns, t.category, month)
    new_status = derive_budget_status(spent, budget.budget_amount)

    if new_status == "exceeded":
        pct = round(spent / budget.budget_amount * 100)
        return Notification(
            user_id=user_id,
            type="budget_alert",
            title=f"{t.category.title()} budget exceeded",
            message=(
                f"You've spent ₹{spent:,.0f} against a ₹{budget.budget_amount:,.0f} "
                f"budget for {t.category} ({pct}% used)."
            ),
            transaction_id=t.id,
        )
    elif new_status == "near_limit":
        pct = round(spent / budget.budget_amount * 100)
        return Notification(
            user_id=user_id,
            type="budget_alert",
            title=f"{t.category.title()} budget near limit",
            message=(
                f"You've used {pct}% of your {t.category} budget "
                f"(₹{spent:,.0f} of ₹{budget.budget_amount:,.0f})."
            ),
            transaction_id=t.id,
        )
    return None


@router.get("", response_model=List[TransactionOut])
def list_transactions(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    loanId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if search:
        term = f"%{search.lower()}%"
        q = q.filter(
            Transaction.description.ilike(term) | Transaction.category.ilike(term)
        )
    if category:
        q = q.filter(Transaction.category == category)
    if type:
        q = q.filter(Transaction.type == type)
    if dateFrom:
        q = q.filter(Transaction.date >= dateFrom)
    if dateTo:
        q = q.filter(Transaction.date <= dateTo)
    if loanId:
        q = q.filter(Transaction.loan_id == loanId)
    results = q.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    return [_to_out(t) for t in results]


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: CreateTransactionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = Transaction(
        user_id=current_user.id,
        date=body.date,
        description=body.description,
        category=body.category,
        amount=body.amount,
        type=body.type,
        payment_method=body.paymentMethod,
        source=body.source,
        loan_id=body.loanId,
        scholarship_id=body.scholarshipId,
        notes=body.notes,
    )
    db.add(t)
    db.flush()  # populate t.id before building notifications

    # ── Notifications (same commit as the transaction) ─────────────────────
    tx_notif = _build_transaction_notification(t, current_user.id)
    db.add(tx_notif)

    budget_notif = _check_budget_alert(t, current_user.id, db)
    if budget_notif:
        db.add(budget_notif)

    db.commit()
    db.refresh(t)
    return _to_out(t)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Transaction).filter(
        Transaction.id == transaction_id, Transaction.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    db.delete(t)
    db.commit()
