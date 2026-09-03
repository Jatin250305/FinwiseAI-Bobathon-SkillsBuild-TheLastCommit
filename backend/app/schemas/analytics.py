from pydantic import BaseModel
from typing import List, Optional


class AnalyticsSummaryOut(BaseModel):
    currentMonthIncome: float
    previousMonthIncome: float
    incomeChange: float
    currentMonthExpenses: float
    previousMonthExpenses: float
    expensesChange: float


class CategoryBreakdownOut(BaseModel):
    category: str
    amount: float
    percentage: float
    previousAmount: Optional[float] = None


class MonthlyTrendPointOut(BaseModel):
    month: str
    income: float
    expenses: float
    savings: float


class AIInsightOut(BaseModel):
    id: str
    type: str
    title: str
    message: str
    generatedAt: str
