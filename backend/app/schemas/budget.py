from pydantic import BaseModel, field_validator
from typing import Optional


VALID_CATEGORIES = {
    "education","food","shopping","healthcare","transportation",
    "accommodation","entertainment","utilities","personal","other"
}


class BudgetOut(BaseModel):
    id: str
    category: str
    budgetAmount: float
    spentAmount: float
    month: str
    status: str  # normal / near_limit / exceeded

    model_config = {"from_attributes": True}


class CreateBudgetRequest(BaseModel):
    category: str
    budgetAmount: float
    month: str

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category: {v}")
        return v

    @field_validator("budgetAmount")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Budget amount must be positive")
        return v


class UpdateBudgetRequest(BaseModel):
    budgetAmount: Optional[float] = None

    @field_validator("budgetAmount")
    @classmethod
    def positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Budget amount must be positive")
        return v
