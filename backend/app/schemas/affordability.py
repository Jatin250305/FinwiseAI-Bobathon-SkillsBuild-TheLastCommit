from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class AffordabilityCheckRequest(BaseModel):
    itemName: str
    itemPrice: float
    category: str
    isRecurring: bool


class AffordabilityResultOut(BaseModel):
    recommendation: str
    itemPrice: float
    availableBalance: float
    expectedMonthlyExpenses: float
    upcomingObligations: float
    savingsGoalContribution: float
    estimatedDisposableAmount: float
    aiExplanation: str


class AffordabilityRecordOut(BaseModel):
    id: str
    itemName: str
    itemPrice: float
    category: str
    isRecurring: bool
    date: str
    recommendation: str
    result: AffordabilityResultOut

    model_config = {"from_attributes": True}
