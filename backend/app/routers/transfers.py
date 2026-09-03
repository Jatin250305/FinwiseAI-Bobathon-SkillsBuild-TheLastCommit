"""
Transfers — internal account-to-account movement.

A transfer is recorded as two Transaction rows atomically:
  • one 'transfer_out' (debit)  — type="transfer_out"
  • one 'transfer_in'  (credit) — type="transfer_in"

Transfer transactions are excluded from analytics income/expense totals
(see finance.py helpers which filter by type).
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Transaction
from app.schemas.transfer import CreateTransferRequest, TransferOut

router = APIRouter(prefix="/transfers", tags=["transfers"])


def _pair_id() -> str:
    """Shared reference ID linking the two legs of a transfer."""
    return str(uuid.uuid4())


@router.post("", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    body: CreateTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record an internal transfer.  Both rows share the same `notes` field which
    stores a JSON-serialisable reference so the pair can be identified later.
    The transfer_out row ID is returned as the canonical transfer ID.
    """
    pair_ref = _pair_id()
    notes_meta = f"transfer_pair:{pair_ref}"
    if body.notes:
        notes_meta = f"{body.notes} | {notes_meta}"

    transfer_out = Transaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        date=body.date,
        description=body.description,
        category="transfer",
        amount=body.amount,
        type="transfer_out",
        payment_method="internal",
        notes=notes_meta,
    )
    transfer_in = Transaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        date=body.date,
        description=body.description,
        category="transfer",
        amount=body.amount,
        type="transfer_in",
        payment_method="internal",
        notes=notes_meta,
    )

    try:
        db.add(transfer_out)
        db.add(transfer_in)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transfer could not be recorded. Please try again.",
        )

    return TransferOut(
        id=transfer_out.id,
        amount=body.amount,
        description=body.description,
        date=body.date,
        notes=body.notes,
    )
