from pydantic import BaseModel, field_validator
from typing import List, Optional


class IncomeSourceOut(BaseModel):
    id: str
    type: str
    label: str
    amount: float
    month: str

    model_config = {"from_attributes": True}


class IncomeSummaryOut(BaseModel):
    monthlyIncome: float
    essentialExpenses: float
    discretionaryExpenses: float
    savings: float
    remaining: float
    incomeSources: List[IncomeSourceOut]


class DashboardSummaryOut(BaseModel):
    monthlyIncome: float
    totalExpenses: float
    remainingBalance: float
    currentSavings: float
    activeLoans: int
    savingsGoalProgress: float
    financialHealthScore: float
    userName: str


_VALID_TYPES = {"salary", "stipend", "allowance", "freelance", "part_time", "scholarship", "other"}


def _validate_type(v: str) -> str:
    if v not in _VALID_TYPES:
        raise ValueError(f"Invalid income source type: {v}")
    return v


def _validate_amount(v: float) -> float:
    if v <= 0:
        raise ValueError("Amount must be positive")
    return v


class CreateIncomeSourceRequest(BaseModel):
    type: str
    label: str
    amount: float
    month: str

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        return _validate_type(v)

    @field_validator("amount")
    @classmethod
    def positive(cls, v: float) -> float:
        return _validate_amount(v)


class UpdateIncomeSourceRequest(BaseModel):
    type: Optional[str] = None
    label: Optional[str] = None
    amount: Optional[float] = None

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validate_type(v)
        return v

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            return _validate_amount(v)
        return v
