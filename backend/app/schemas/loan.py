from pydantic import BaseModel, field_validator
from typing import Optional, List


class LoanOut(BaseModel):
    id: str
    name: str
    principalAmount: float
    amountUsed: float
    remainingLoan: float
    interestRate: float
    tenureMonths: int
    emi: float
    totalRepayment: float
    totalInterest: float
    loanStartDate: str
    repaymentStartDate: str
    status: str

    model_config = {"from_attributes": True}


class CreateLoanRequest(BaseModel):
    name: str
    principalAmount: float
    interestRate: float
    tenureMonths: int
    loanStartDate: str
    repaymentStartDate: str

    @field_validator("principalAmount")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Principal amount must be positive")
        return v

    @field_validator("interestRate")
    @classmethod
    def valid_rate(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("Interest rate must be between 0 and 100")
        return v

    @field_validator("tenureMonths")
    @classmethod
    def valid_tenure(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Tenure must be positive")
        return v


class LoanUsageBreakdownOut(BaseModel):
    category: str
    amount: float
    percentage: float


class LoanUsageOut(BaseModel):
    loanId: str
    totalUsed: float
    breakdown: List[LoanUsageBreakdownOut]
    aiExplanation: Optional[str] = None
