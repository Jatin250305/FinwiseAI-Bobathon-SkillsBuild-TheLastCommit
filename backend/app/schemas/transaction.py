from pydantic import BaseModel, field_validator
from typing import Optional, List


class TransactionOut(BaseModel):
    id: str
    date: str
    description: str
    category: str
    amount: float
    type: str
    paymentMethod: str
    source: Optional[str] = None
    loanId: Optional[str] = None
    scholarshipId: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class CreateTransactionRequest(BaseModel):
    date: str
    description: str
    category: str
    amount: float
    type: str
    paymentMethod: str
    source: Optional[str] = None
    loanId: Optional[str] = None
    scholarshipId: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        valid = {"education","food","shopping","healthcare","transportation",
                 "accommodation","entertainment","utilities","personal","other"}
        if v not in valid:
            raise ValueError(f"Invalid category: {v}")
        return v

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        if v not in {"income","expense","loan","scholarship","savings"}:
            raise ValueError(f"Invalid type: {v}")
        return v

    @field_validator("paymentMethod")
    @classmethod
    def valid_method(cls, v: str) -> str:
        if v not in {"upi","cash","card","bank_transfer","other"}:
            raise ValueError(f"Invalid payment method: {v}")
        return v
