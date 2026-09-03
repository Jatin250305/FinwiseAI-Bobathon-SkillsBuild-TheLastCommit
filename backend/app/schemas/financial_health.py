from pydantic import BaseModel
from typing import Dict


class HealthMetricOut(BaseModel):
    label: str
    score: float
    weight: float
    description: str


class FinancialHealthOut(BaseModel):
    overallScore: float
    previousScore: float
    scoreChange: float
    metrics: Dict[str, HealthMetricOut]
    aiExplanation: str
    generatedAt: str
