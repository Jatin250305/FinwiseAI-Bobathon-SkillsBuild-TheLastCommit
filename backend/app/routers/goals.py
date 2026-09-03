from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.deps import get_current_user
from app.models import User, Goal
from app.schemas.goal import GoalOut, CreateGoalRequest, UpdateGoalRequest

router = APIRouter(prefix="/goals", tags=["goals"])


def _to_out(g: Goal) -> GoalOut:
    return GoalOut(
        id=g.id,
        name=g.name,
        category=g.category,
        targetAmount=g.target_amount,
        currentAmount=g.current_amount,
        deadline=g.deadline,
        monthlyContribution=g.monthly_contribution,
        status=g.status,
    )


@router.get("", response_model=List[GoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    return [_to_out(g) for g in goals]


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    body: CreateGoalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = Goal(
        user_id=current_user.id,
        name=body.name,
        category=body.category,
        target_amount=body.targetAmount,
        current_amount=body.currentAmount,
        deadline=body.deadline,
        monthly_contribution=body.monthlyContribution,
        status="active",
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _to_out(g)


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str,
    body: UpdateGoalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = db.query(Goal).filter(
        Goal.id == goal_id, Goal.user_id == current_user.id
    ).first()
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    if body.name is not None:
        g.name = body.name
    if body.category is not None:
        g.category = body.category
    if body.targetAmount is not None:
        g.target_amount = body.targetAmount
    if body.currentAmount is not None:
        g.current_amount = body.currentAmount
    if body.deadline is not None:
        g.deadline = body.deadline
    if body.monthlyContribution is not None:
        g.monthly_contribution = body.monthlyContribution
    if body.status is not None:
        g.status = body.status
    db.commit()
    db.refresh(g)
    return _to_out(g)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = db.query(Goal).filter(
        Goal.id == goal_id, Goal.user_id == current_user.id
    ).first()
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    db.delete(g)
    db.commit()
