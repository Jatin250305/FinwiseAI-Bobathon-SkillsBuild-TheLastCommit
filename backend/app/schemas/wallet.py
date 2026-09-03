from pydantic import BaseModel, field_validator
from typing import Optional


class WalletOut(BaseModel):
    id: str
    userId: str
    balance: float
    currency: str
    updatedAt: str

    model_config = {"from_attributes": True}


class WalletDepositRequest(BaseModel):
    amount: float
    description: str

    @field_validator("amount")
    @classmethod
    def positive_and_bounded(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Deposit amount must be positive")
        if v > 100_000:
            raise ValueError("Maximum single deposit is ₹1,00,000")
        return round(v, 2)

    @field_validator("description")
    @classmethod
    def non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Description cannot be empty")
        return v.strip()
