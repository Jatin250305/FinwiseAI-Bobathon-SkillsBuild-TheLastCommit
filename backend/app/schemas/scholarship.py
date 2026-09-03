from pydantic import BaseModel
from typing import List, Optional


class ScholarshipOut(BaseModel):
    id: str
    name: str
    provider: str
    amount: float
    eligibilityDescription: str
    academicRequirements: str
    incomeRequirements: str
    deadline: str
    requiredDocuments: List[str]
    applicationStatus: Optional[str] = None
    officialUrl: str
    category: Optional[str] = None
    academicLevel: Optional[str] = None

    model_config = {"from_attributes": True}


class EligibilityCheckRequest(BaseModel):
    course: str
    year: int
    cgpa: float
    familyIncome: float
    location: str
    category: Optional[str] = None


class EligibilityResultOut(BaseModel):
    scholarship: dict
    eligibility: dict
    source: dict
    relevance: Optional[float] = None
