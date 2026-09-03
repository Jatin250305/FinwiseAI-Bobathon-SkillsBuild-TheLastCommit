"""
AI chat service.

Rule-based responses use the authenticated user's real financial data passed
as `financial_context`. The OpenAI path (when key is configured) passes the
same data as a structured system prompt — never the whole DB.

Security: every call is scoped to one user's data. The service never accepts
raw DB objects or user IDs — it only works with the pre-computed context dict
assembled in the AI router.
"""
from app.core.config import settings


def _fmt(amount: float) -> str:
    return f"₹{amount:,.0f}"


def _rule_based_response(message: str, ctx: dict) -> dict:
    """Keyword-matched responses using real financial data from context."""
    lower = message.lower()

    income = ctx.get("monthly_income", 0)
    expenses = ctx.get("monthly_expenses", 0)
    savings = ctx.get("monthly_savings", 0)
    prev_income = ctx.get("prev_month_income", 0)
    prev_expenses = ctx.get("prev_month_expenses", 0)
    current_savings = ctx.get("current_savings", 0)
    emi = ctx.get("emi", 0)
    health_score = ctx.get("health_score", 0)
    categories: dict = ctx.get("category_breakdown", {})
    largest = ctx.get("largest_expense", 0)
    largest_desc = ctx.get("largest_expense_description", "")
    recent: list = ctx.get("recent_transactions", [])
    goals: list = ctx.get("savings_goals", [])
    name = ctx.get("user_name", "")

    disposable = max(0, income - expenses - emi)

    # ── spending / expenses ───────────────────────────────────────────────────
    if any(w in lower for w in ("how much did i spend", "total spend", "total expense", "spending this month", "spent this month")):
        if not expenses:
            return {
                "message": "You haven't recorded any expenses this month yet. Add transactions to start tracking your spending.",
                "intent": "expense_query",
                "disclaimer": "Based on your verified FinWise transaction data.",
            }
        change = ""
        if prev_expenses:
            delta = round((expenses - prev_expenses) / prev_expenses * 100, 1)
            change = f" That's {'↑' if delta > 0 else '↓'}{abs(delta)}% compared to last month ({_fmt(prev_expenses)})."
        return {
            "message": f"Your total expenses this month are {_fmt(expenses)}.{change}",
            "intent": "expense_query",
            "data": [{
                "type": "financial_data",
                "title": "This Month's Expenses",
                "values": {
                    **{cat.title(): _fmt(amt) for cat, amt in categories.items()},
                    "Total": _fmt(expenses),
                },
            }],
            "disclaimer": "Based on your verified transaction data.",
        }

    # ── where spending most / category ────────────────────────────────────────
    if any(w in lower for w in ("where am i spending", "biggest expense category", "most spending", "top category", "highest spend")):
        if not categories:
            return {
                "message": "No expense categories recorded this month yet. Add some transactions to see your spending breakdown.",
                "intent": "category_query",
            }
        top_cat, top_amt = next(iter(categories.items()))
        pct = round(top_amt / expenses * 100) if expenses else 0
        others = list(categories.items())[1:4]
        breakdown = ", ".join(f"{c.title()} {_fmt(a)}" for c, a in others)
        return {
            "message": (
                f"Your biggest spending category this month is **{top_cat.title()}** at {_fmt(top_amt)} "
                f"({pct}% of total expenses)."
                + (f" After that: {breakdown}." if breakdown else "")
            ),
            "intent": "category_query",
            "data": [{
                "type": "financial_data",
                "title": "Category Breakdown",
                "values": {cat.title(): _fmt(amt) for cat, amt in categories.items()},
            }],
            "disclaimer": "Based on your verified transaction data.",
        }

    # ── how much received / income ────────────────────────────────────────────
    if any(w in lower for w in ("how much did i receive", "received this month", "income this month", "how much income")):
        if not income:
            return {
                "message": "No income has been recorded this month. Add income transactions or income sources to track what you've received.",
                "intent": "income_query",
            }
        change = ""
        if prev_income:
            delta = round((income - prev_income) / prev_income * 100, 1)
            change = f" That's {'↑' if delta > 0 else '↓'}{abs(delta)}% vs last month ({_fmt(prev_income)})."
        return {
            "message": f"Your total income this month is {_fmt(income)}.{change}",
            "intent": "income_query",
            "disclaimer": "Based on your verified income transaction data.",
        }

    # ── largest / biggest payment ─────────────────────────────────────────────
    if any(w in lower for w in ("largest", "biggest payment", "biggest expense", "highest expense", "most expensive")):
        if not largest:
            return {
                "message": "No expenses recorded this month yet.",
                "intent": "largest_expense_query",
            }
        return {
            "message": f"Your largest expense this month is {_fmt(largest)} — \"{largest_desc}\".",
            "intent": "largest_expense_query",
            "disclaimer": "Based on your verified transaction data.",
        }

    # ── compare this month vs last ────────────────────────────────────────────
    if any(w in lower for w in ("compare", "last month", "previous month", "month over month")):
        if not (income or expenses or prev_income or prev_expenses):
            return {
                "message": "Not enough transaction data to compare months yet. Add transactions over multiple months to see comparisons.",
                "intent": "comparison_query",
            }
        exp_delta = round((expenses - prev_expenses) / prev_expenses * 100, 1) if prev_expenses else None
        inc_delta = round((income - prev_income) / prev_income * 100, 1) if prev_income else None
        lines = []
        if inc_delta is not None:
            lines.append(f"Income: {_fmt(income)} vs {_fmt(prev_income)} last month ({'↑' if inc_delta > 0 else '↓'}{abs(inc_delta)}%)")
        if exp_delta is not None:
            lines.append(f"Expenses: {_fmt(expenses)} vs {_fmt(prev_expenses)} last month ({'↑' if exp_delta > 0 else '↓'}{abs(exp_delta)}%)")
        lines.append(f"Net this month: {_fmt(income - expenses)}")
        return {
            "message": "\n".join(lines),
            "intent": "comparison_query",
            "data": [{
                "type": "financial_data",
                "title": "Month-over-Month Comparison",
                "values": {
                    "This month income": _fmt(income),
                    "Last month income": _fmt(prev_income),
                    "This month expenses": _fmt(expenses),
                    "Last month expenses": _fmt(prev_expenses),
                },
            }],
            "disclaimer": "Based on your verified transaction data.",
        }

    # ── summary ───────────────────────────────────────────────────────────────
    if any(w in lower for w in ("summary", "overview", "give me a summary", "financial summary")):
        surplus = income - expenses
        surplus_str = f"{'surplus' if surplus >= 0 else 'deficit'} of {_fmt(abs(surplus))}"
        parts = [f"This month: income {_fmt(income)}, expenses {_fmt(expenses)}, {surplus_str}."]
        if emi:
            parts.append(f"Active loan EMI: {_fmt(emi)}/month.")
        if goals:
            parts.append(f"You have {len(goals)} active savings goal(s).")
        parts.append(f"Financial health score: {health_score:.0f}/100.")
        return {
            "message": " ".join(parts),
            "intent": "summary_query",
            "data": [{
                "type": "financial_data",
                "title": "Financial Summary",
                "values": {
                    "Monthly Income": _fmt(income),
                    "Monthly Expenses": _fmt(expenses),
                    "Net Surplus": _fmt(income - expenses),
                    "Loan EMI": _fmt(emi),
                    "Health Score": f"{health_score:.0f}/100",
                },
            }],
            "disclaimer": "Based on your verified FinWise data.",
        }

    # ── savings ───────────────────────────────────────────────────────────────
    if any(w in lower for w in ("save", "saving", "savings", "how much can i save")):
        target_20 = income * 0.20
        return {
            "message": (
                f"Based on your income ({_fmt(income)}) and expenses ({_fmt(expenses)} + EMI {_fmt(emi)}), "
                f"your estimated saveable amount this month is {_fmt(disposable)}. "
                f"The recommended 20% savings target would be {_fmt(target_20)}."
                + (f" You've already saved {_fmt(savings)} this month." if savings else "")
            ),
            "intent": "savings_query",
            "disclaimer": "Estimated from your verified financial data.",
        }

    # ── goals ─────────────────────────────────────────────────────────────────
    if any(w in lower for w in ("goal", "goals", "savings goal", "target")):
        if not goals:
            return {
                "message": "You don't have any active savings goals yet. Create one on the Savings Goals page.",
                "intent": "goals_query",
            }
        lines = [f"You have {len(goals)} active goal(s):"]
        for g in goals:
            lines.append(f"• {g['name']}: {_fmt(g['current'])} of {_fmt(g['target'])} ({g['pct']}%)")
        return {
            "message": "\n".join(lines),
            "intent": "goals_query",
            "disclaimer": "Based on your verified savings goals.",
        }

    # ── affordability ─────────────────────────────────────────────────────────
    if any(w in lower for w in ("afford", "can i buy", "can i get", "should i buy")):
        return {
            "message": (
                f"Your estimated disposable amount this month is {_fmt(disposable)} "
                f"(after income {_fmt(income)}, expenses {_fmt(expenses)}, and EMI {_fmt(emi)}). "
                f"Use the Affordability Checker for a detailed analysis of any specific purchase."
            ),
            "intent": "affordability_query",
            "data": [{
                "type": "financial_data",
                "title": "Your Financial Snapshot",
                "values": {
                    "Monthly Income": _fmt(income),
                    "Monthly Expenses": _fmt(expenses),
                    "Loan EMI": _fmt(emi),
                    "Estimated Disposable": _fmt(disposable),
                },
            }],
            "disclaimer": "Based on your verified FinWise data. Use the Affordability Checker for a precise analysis.",
        }

    # ── health score ──────────────────────────────────────────────────────────
    if any(w in lower for w in ("health score", "financial health", "score")):
        label = "Good" if health_score >= 75 else "Fair" if health_score >= 50 else "Needs attention"
        return {
            "message": (
                f"Your financial health score is {health_score:.0f}/100 ({label}). "
                f"Visit the Financial Health page for a full breakdown of all 6 metrics."
            ),
            "intent": "health_score_query",
            "data": [{"type": "financial_data", "title": "Financial Health", "values": {"Overall Score": f"{health_score:.0f}/100"}}],
            "disclaimer": "Calculated by the FinWise backend using your verified data.",
        }

    # ── budget ────────────────────────────────────────────────────────────────
    if "budget" in lower:
        return {
            "message": "Visit the Budget page to see your category-by-category budget status, including which categories are near their limits or have exceeded them.",
            "intent": "budget_query",
        }

    # ── education loan application ─────────────────────────────────────────────
    edu_loans: list = ctx.get("education_loans", [])
    edu_apps: list = ctx.get("education_loan_applications", [])

    if any(w in lower for w in (
        "education loan", "my loan application", "loan application", "loan status",
        "approved loan", "disbursed loan", "loan disbursed", "how much loan",
        "loan amount", "loan approved", "loan rejected", "edu-", "loan id",
    )):
        if edu_loans:
            latest = edu_loans[0]
            lines = [f"Your most recent education loan ({latest['loan_id']}):"]
            lines.append(f"• Approved Amount: {_fmt(latest['approved_amount'])}")
            lines.append(f"• Status: {latest['status'].replace('_', ' ').title()}")
            if latest.get("disbursed_at"):
                lines.append(f"• Disbursed: {latest['disbursed_at'][:10]}")
            if len(edu_loans) > 1:
                lines.append(f"You have {len(edu_loans)} education loan(s) in total.")
            return {
                "message": "\n".join(lines),
                "intent": "education_loan_query",
                "data": [{
                    "type": "financial_data",
                    "title": "Your Education Loan",
                    "values": {
                        "Loan ID": latest["loan_id"],
                        "Approved Amount": _fmt(latest["approved_amount"]),
                        "Status": latest["status"].replace("_", " ").title(),
                    },
                }],
                "disclaimer": "Based on your verified education loan data.",
            }
        if edu_apps:
            latest_app = edu_apps[0]
            return {
                "message": (
                    f"Your education loan application {latest_app['application_id']} is currently "
                    f"in '{latest_app['status'].replace('_', ' ')}' status. "
                    f"Requested: {_fmt(latest_app['requested_amount'])}."
                ),
                "intent": "education_loan_query",
                "disclaimer": "Based on your verified application data.",
            }
        return {
            "message": "You don't have any education loan applications yet. Visit the Education Loan page to apply.",
            "intent": "education_loan_query",
        }

    # ── loan (legacy EMI-based loans) ──────────────────────────────────────────
    if any(w in lower for w in ("loan", "emi", "repayment", "interest")):
        if emi:
            return {
                "message": f"Your active loan EMI is {_fmt(emi)}/month. Visit the Education Loan page for the full breakdown of principal, interest, and repayment schedule.",
                "intent": "loan_query",
                "disclaimer": "EMI calculated using the reducing-balance formula by the FinWise backend.",
            }
        return {
            "message": "You don't have any active loans registered. Add a loan on the Education Loan page.",
            "intent": "loan_query",
        }

    # ── recent transactions ───────────────────────────────────────────────────
    if any(w in lower for w in ("recent transaction", "last transaction", "what did i spend on", "transaction history")):
        if not recent:
            return {
                "message": "No transactions recorded yet. Start adding transactions on the Transactions page.",
                "intent": "recent_transactions_query",
            }
        lines = ["Your 5 most recent transactions:"]
        for t in recent:
            sign = "+" if t["type"] in ("income", "scholarship") else "-"
            lines.append(f"• {t['date']} {sign}{_fmt(t['amount'])} — {t['description']}")
        return {
            "message": "\n".join(lines),
            "intent": "recent_transactions_query",
            "disclaimer": "Based on your verified transaction data.",
        }

    # ── scholarship ───────────────────────────────────────────────────────────
    if "scholarship" in lower:
        return {
            "message": "Visit the Scholarships page to browse available scholarships and check your eligibility based on your profile.",
            "intent": "scholarship_query",
        }

    # ── default ───────────────────────────────────────────────────────────────
    return {
        "message": (
            "I can help you with your finances. Try asking:\n"
            "• \"How much did I spend this month?\"\n"
            "• \"Where am I spending the most?\"\n"
            "• \"Compare this month vs last month\"\n"
            "• \"What was my largest expense?\"\n"
            "• \"How much can I save this month?\"\n"
            "• \"Give me a financial summary\"\n\n"
            "All responses are based on your verified FinWise account data."
        ),
        "intent": "general",
        "disclaimer": "FinWise Copilot uses your verified financial data to answer questions.",
    }


async def get_ai_response(message: str, financial_context: dict) -> dict:
    """
    Returns an AIChatResponse-compatible dict.
    Uses OpenAI if key is present, otherwise rule-based fallback.
    """
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            ctx = financial_context
            income = ctx.get("monthly_income", 0)
            expenses = ctx.get("monthly_expenses", 0)
            savings = ctx.get("monthly_savings", 0)
            prev_income = ctx.get("prev_month_income", 0)
            prev_expenses = ctx.get("prev_month_expenses", 0)
            emi = ctx.get("emi", 0)
            current_savings = ctx.get("current_savings", 0)
            health = ctx.get("health_score", 0)
            disposable = max(0, income - expenses - emi)
            categories = ctx.get("category_breakdown", {})
            largest = ctx.get("largest_expense", 0)
            largest_desc = ctx.get("largest_expense_description", "")
            recent = ctx.get("recent_transactions", [])
            goals = ctx.get("savings_goals", [])
            name = ctx.get("user_name", "the user")

            cat_lines = "\n".join(f"  - {c.title()}: ₹{a:,.0f}" for c, a in categories.items()) or "  None recorded"
            recent_lines = "\n".join(
                f"  - {t['date']} {'+'  if t['type'] in ('income','scholarship') else '-'}₹{t['amount']:,.0f} {t['description']}"
                for t in recent
            ) or "  None"
            goal_lines = "\n".join(f"  - {g['name']}: {g['pct']}% of ₹{g['target']:,.0f}" for g in goals) or "  None"

            system_prompt = f"""You are FinWise AI, a financial assistant for {name}.
Answer questions using ONLY the verified financial data below. Never invent numbers.
Be concise (under 120 words), concrete, and use ₹ for currency.
If asked about another user's data, refuse politely.

VERIFIED FINANCIAL DATA (this month):
- Monthly Income: ₹{income:,.0f}
- Monthly Expenses: ₹{expenses:,.0f}
- Monthly Savings recorded: ₹{savings:,.0f}
- Estimated Disposable (income - expenses - EMI): ₹{disposable:,.0f}
- Total Cumulative Savings: ₹{current_savings:,.0f}
- Loan EMI: ₹{emi:,.0f}/month
- Health Score: {health:.0f}/100
- Largest expense this month: ₹{largest:,.0f} ({largest_desc})

LAST MONTH:
- Income: ₹{prev_income:,.0f}
- Expenses: ₹{prev_expenses:,.0f}

CATEGORY BREAKDOWN (this month):
{cat_lines}

RECENT TRANSACTIONS:
{recent_lines}

SAVINGS GOALS:
{goal_lines}
"""

            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                max_tokens=300,
                temperature=0.3,
            )
            reply = resp.choices[0].message.content or ""
            return {
                "message": reply,
                "intent": "ai_response",
                "disclaimer": "Response generated by AI using your verified FinWise financial data.",
            }
        except Exception:
            pass  # Fall through to rule-based

    return _rule_based_response(message, financial_context)
