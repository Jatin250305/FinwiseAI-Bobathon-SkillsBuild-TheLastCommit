from pydantic import BaseModel, field_validator
from typing import Optional


class CreateTransferRequest(BaseModel):
    amount: float
    description: str
    date: str            # YYYY-MM-DD
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Transfer amount must be positive")
        return v

    @field_validator("date")
    @classmethod
    def valid_date(cls, v: str) -> str:
        if len(v) != 10 or v[4] != "-" or v[7] != "-":
            raise ValueError("Date must be in YYYY-MM-DD format")
        return v


class TransferOut(BaseModel):
    id: str
    amount: float
    description: str
    date: str
    notes: Optional[str] = None
