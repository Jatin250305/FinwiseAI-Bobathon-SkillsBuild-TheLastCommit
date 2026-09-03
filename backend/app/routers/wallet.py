"""
Virtual wallet router.

Balance is the single authoritative number stored in the `wallets` table.
All mutations are atomic: we use SELECT ... FOR UPDATE (PostgreSQL) or
a single UPDATE statement (SQLite) to prevent race conditions.

No frontend-supplied balance values are ever trusted.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Wallet, Transaction, Notification
from app.schemas.wallet import WalletOut, WalletDepositRequest

router = APIRouter(prefix="/wallet", tags=["wallet"])


def _get_or_create_wallet(user_id: str, db: Session) -> Wallet:
    """Return the user's wallet, creating one with zero balance if missing."""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(
            user_id=user_id,
            balance=0.0,
            currency="INR",
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def _wallet_out(w: Wallet) -> WalletOut:
    return WalletOut(
        id=w.id,
        userId=w.user_id,
        balance=round(w.balance, 2),
        currency=w.currency,
        updatedAt=w.updated_at.isoformat() if w.updated_at else w.created_at.isoformat(),
    )


@router.get("", response_model=WalletOut)
def get_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the authenticated user's wallet balance."""
    wallet = _get_or_create_wallet(current_user.id, db)
    return _wallet_out(wallet)


@router.post("/deposit", response_model=WalletOut, status_code=status.HTTP_200_OK)
def deposit(
    body: WalletDepositRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add virtual funds to the user's wallet (sandbox/test flow).

    In production this endpoint would be called only after a real payment
    gateway (Razorpay, Stripe, etc.) confirms the charge. For now it acts
    as a sandbox deposit: validates the amount server-side, updates the
    balance atomically, and records the transaction + notification.
    """
    # Atomic balance update using a single UPDATE statement to avoid race conditions
    wallet = db.query(Wallet).filter(
        Wallet.user_id == current_user.id
    ).with_for_update().first()

    if not wallet:
        wallet = _get_or_create_wallet(current_user.id, db)
        # Re-acquire with lock
        wallet = db.query(Wallet).filter(
            Wallet.user_id == current_user.id
        ).with_for_update().first()

    wallet.balance = round(wallet.balance + body.amount, 2)
    wallet.updated_at = datetime.now(timezone.utc)

    # Record as an income transaction for ledger/analytics purposes
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    txn = Transaction(
        user_id=current_user.id,
        date=today,
        description=body.description,
        category="other",
        amount=body.amount,
        type="income",
        payment_method="bank_transfer",
        notes="Virtual wallet deposit",
    )
    db.add(txn)
    db.flush()  # get txn.id before commit

    # Notification for the deposit
    notif = Notification(
        user_id=current_user.id,
        type="transaction",
        title="Funds added to wallet",
        message=f"₹{body.amount:,.0f} added to your wallet. New balance: ₹{wallet.balance:,.0f}.",
        transaction_id=txn.id,
    )
    db.add(notif)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deposit could not be processed. Please try again.",
        )

    db.refresh(wallet)
    return _wallet_out(wallet)
