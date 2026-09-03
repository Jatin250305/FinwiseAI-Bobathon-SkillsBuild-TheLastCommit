"""
Pure financial calculations.
All values returned here are the authoritative backend numbers that the frontend displays.
"""
from typing import List, Optional
from datetime import datetime, date, timezone


def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """
    Monthly EMI using reducing-balance formula:
      EMI = P × r × (1+r)^n  /  ((1+r)^n - 1)
    where r = monthly interest rate = annual_rate / 1200
    """
    if annual_rate == 0:
        return principal / tenure_months
    r = annual_rate / 1200.0
    return round(principal * r * (1 + r) ** tenure_months / ((1 + r) ** tenure_months - 1), 2)


def calculate_total_repayment(emi: float, tenure_months: int) -> float:
    return round(emi * tenure_months, 2)


def calculate_total_interest(principal: float, total_repayment: float) -> float:
    return round(max(0.0, total_repayment - principal), 2)


def derive_budget_status(spent: float, budget: float) -> str:
    if budget <= 0:
        return "normal"
    ratio = spent / budget
    if ratio >= 1.0:
        return "exceeded"
    if ratio >= 0.8:
        return "near_limit"
    return "normal"


def compute_spent_for_budget(transactions: list, category: str, month: str) -> float:
    """Sum expense-type transactions for a given category and month."""
    total = 0.0
    for t in transactions:
        t_month = t.date[:7]  # YYYY-MM
        if t_month == month and t.category == category and t.type in ("expense", "loan"):
            total += t.amount
    return total


def compute_monthly_income(transactions: list, month: str) -> float:
    return sum(
        t.amount for t in transactions
        if t.date[:7] == month and t.type in ("income", "scholarship")
    )


def compute_monthly_expenses(transactions: list, month: str) -> float:
    return sum(
        t.amount for t in transactions
        if t.date[:7] == month and t.type in ("expense", "loan")
    )


def compute_monthly_savings(transactions: list, month: str) -> float:
    return sum(
        t.amount for t in transactions
        if t.date[:7] == month and t.type == "savings"
    )


def compute_financial_health_score(
    monthly_income: float,
    monthly_expenses: float,
    monthly_savings: float,
    active_emi: float,
    goals: list,
    budgets_status: list,  # list of BudgetOut-like objects
) -> dict:
    """
    Weighted health score from 6 metrics.
    Returns dict matching FinancialHealthOut.metrics shape.
    """
    score_savings_rate = 0.0
    if monthly_income > 0:
        savings_rate = monthly_savings / monthly_income
        # 20%+ → 82+, 10–20% → 50–82, <10% → 0–50
        score_savings_rate = min(100.0, savings_rate * 400)

    # Budget adherence: penalise exceeded/near_limit
    exceeded = sum(1 for b in budgets_status if b.get("status") == "exceeded")
    near = sum(1 for b in budgets_status if b.get("status") == "near_limit")
    total_budgets = len(budgets_status) or 1
    score_budget = max(0.0, 100 - exceeded * 20 - near * 8) * (0.8 + 0.2 * (1 - (exceeded + near) / total_budgets))

    # Spending stability — 75 baseline, can't compute from single month
    score_spending_stability = 75.0

    # Debt burden: EMI/income ratio
    score_debt = 100.0
    if monthly_income > 0 and active_emi > 0:
        emi_ratio = active_emi / monthly_income
        if emi_ratio <= 0.2:
            score_debt = 85.0
        elif emi_ratio <= 0.3:
            score_debt = 68.0
        elif emi_ratio <= 0.4:
            score_debt = 50.0
        else:
            score_debt = max(20.0, 100 - emi_ratio * 200)

    # Goal progress: average progress across active goals
    if goals:
        progresses = [min(1.0, g.current_amount / g.target_amount) for g in goals if g.target_amount > 0]
        score_goals = (sum(progresses) / len(progresses)) * 100 if progresses else 50.0
    else:
        score_goals = 50.0

    # Emergency reserve: savings / monthly_expenses
    score_emergency = 50.0
    if monthly_expenses > 0:
        months_covered = monthly_savings * 12 / monthly_expenses  # rough annualised
        score_emergency = min(100.0, months_covered * 20)

    weights = {
        "savingsRate":       (score_savings_rate, 0.25, "Savings Rate"),
        "budgetAdherence":   (score_budget, 0.20, "Budget Adherence"),
        "spendingStability": (score_spending_stability, 0.15, "Spending Stability"),
        "debtBurden":        (score_debt, 0.20, "Debt Burden"),
        "goalProgress":      (score_goals, 0.10, "Goal Progress"),
        "emergencyReserve":  (score_emergency, 0.10, "Emergency Reserve"),
    }

    overall = sum(score * weight for (score, weight, _) in weights.values())

    metrics = {}
    for key, (score, weight, label) in weights.items():
        metrics[key] = {
            "label": label,
            "score": round(score, 1),
            "weight": weight,
            "description": _metric_description(key, score, monthly_income, monthly_expenses, active_emi, monthly_savings),
        }

    return {"overall": round(overall, 1), "metrics": metrics}


def _metric_description(key: str, score: float, income: float, expenses: float, emi: float, savings: float) -> str:
    if key == "savingsRate":
        rate = round(savings / income * 100, 1) if income else 0
        return f"You are saving {rate}% of your monthly income{'. Above the recommended 20%.' if rate >= 20 else '.'}"
    if key == "budgetAdherence":
        return "Budget adherence based on your current category spending vs. limits."
    if key == "spendingStability":
        return "Your spending stability score based on month-over-month consistency."
    if key == "debtBurden":
        ratio = round(emi / income * 100, 1) if income else 0
        return f"Your EMI-to-income ratio is {ratio}%, which is {'within acceptable range.' if ratio <= 30 else 'higher than recommended.'}"
    if key == "goalProgress":
        return "Progress across all active savings goals."
    if key == "emergencyReserve":
        return "Your emergency fund coverage based on current savings relative to expenses."
    return ""


def compute_affordability(
    item_price: float,
    available_balance: float,
    monthly_expenses: float,
    active_emi: float,
    monthly_goal_contribution: float,
    monthly_income: float,
    item_name: str,
    category: str,
) -> dict:
    """
    Returns AffordabilityResultOut-compatible dict.
    Disposable = income - expenses - EMI - goal_contributions
    """
    disposable = max(0.0, monthly_income - monthly_expenses - active_emi - monthly_goal_contribution)

    ratio = item_price / disposable if disposable > 0 else float("inf")

    if ratio <= 0.5:
        recommendation = "comfortable"
        explanation = (
            f"This purchase is comfortably within your budget. At ₹{item_price:,.0f}, "
            f"it represents {round(ratio * 100)}% of your estimated disposable amount this month."
        )
    elif ratio <= 1.5:
        recommendation = "proceed_with_caution"
        explanation = (
            f"You can afford this, but it would consume {round(ratio * 100)}% of your disposable income "
            f"(₹{disposable:,.0f}). Consider your upcoming EMI and savings goals before proceeding."
        )
    else:
        recommendation = "not_recommended"
        explanation = (
            f"This purchase of ₹{item_price:,.0f} exceeds your estimated disposable amount "
            f"of ₹{disposable:,.0f}. With active financial obligations, this is not recommended right now."
        )

    return {
        "recommendation": recommendation,
        "itemPrice": item_price,
        "availableBalance": round(available_balance, 2),
        "expectedMonthlyExpenses": round(monthly_expenses, 2),
        "upcomingObligations": round(active_emi, 2),
        "savingsGoalContribution": round(monthly_goal_contribution, 2),
        "estimatedDisposableAmount": round(disposable, 2),
        "aiExplanation": explanation,
    }
