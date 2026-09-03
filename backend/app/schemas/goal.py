from pydantic import BaseModel, field_validator
from typing import Optional

VALID_GOAL_CATEGORIES = {"emergency_fund","education","travel","laptop","other"}
VALID_STATUSES = {"active","completed","paused"}


class GoalOut(BaseModel):
    id: str
    name: str
    category: str
    targetAmount: float
    currentAmount: float
    deadline: str
    monthlyContribution: float
    status: str

    model_config = {"from_attributes": True}


class CreateGoalRequest(BaseModel):
    name: str
    category: str
    targetAmount: float
    currentAmount: float
    deadline: str
    monthlyContribution: float

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        if v not in VALID_GOAL_CATEGORIES:
            raise ValueError(f"Invalid goal category: {v}")
        return v

    @field_validator("targetAmount")
    @classmethod
    def positive_target(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Target amount must be positive")
        return v

    @field_validator("currentAmount")
    @classmethod
    def non_negative_current(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Current amount cannot be negative")
        return v

    @field_validator("monthlyContribution")
    @classmethod
    def non_negative_contrib(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Monthly contribution cannot be negative")
        return v


class UpdateGoalRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    targetAmount: Optional[float] = None
    currentAmount: Optional[float] = None
    deadline: Optional[str] = None
    monthlyContribution: Optional[float] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {v}")
        return v
