from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Budget, Transaction
from app.schemas.budget import BudgetOut, CreateBudgetRequest, UpdateBudgetRequest
from app.services.finance import compute_spent_for_budget, derive_budget_status

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _to_out(b: Budget, spent: float) -> BudgetOut:
    status_val = derive_budget_status(spent, b.budget_amount)
    return BudgetOut(
        id=b.id,
        category=b.category,
        budgetAmount=b.budget_amount,
        spentAmount=round(spent, 2),
        month=b.month,
        status=status_val,
    )


@router.get("", response_model=List[BudgetOut])
def list_budgets(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Budget).filter(Budget.user_id == current_user.id)
    if month:
        q = q.filter(Budget.month == month)
    budgets = q.all()

    # Compute real spent amounts from transactions
    all_txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    result = []
    for b in budgets:
        spent = compute_spent_for_budget(all_txns, b.category, b.month)
        result.append(_to_out(b, spent))
    return result


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    body: CreateBudgetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent duplicate budget for same category+month
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == body.category,
        Budget.month == body.month,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget for {body.category} in {body.month} already exists",
        )
    b = Budget(
        user_id=current_user.id,
        category=body.category,
        budget_amount=body.budgetAmount,
        month=body.month,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    all_txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    spent = compute_spent_for_budget(all_txns, b.category, b.month)
    return _to_out(b, spent)


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: str,
    body: UpdateBudgetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Budget).filter(
        Budget.id == budget_id, Budget.user_id == current_user.id
    ).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    if body.budgetAmount is not None:
        b.budget_amount = body.budgetAmount
    db.commit()
    db.refresh(b)
    all_txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    spent = compute_spent_for_budget(all_txns, b.category, b.month)
    return _to_out(b, spent)
