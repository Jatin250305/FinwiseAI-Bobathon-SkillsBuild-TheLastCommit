// ── Income / Dashboard summary types ─────────────────────────────────────────
export interface IncomeSummary {
  monthlyIncome: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  savings: number;
  remaining: number;
  incomeSources: IncomeSource[];
}

export interface IncomeSource {
  id: string;
  type: 'salary' | 'stipend' | 'allowance' | 'freelance' | 'part_time' | 'scholarship' | 'other';
  label: string;
  amount: number;
  month: string;   // YYYY-MM
}

export interface DashboardSummary {
  monthlyIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  currentSavings: number;
  activeLoans: number;
  savingsGoalProgress: number;   // percentage 0–100
  financialHealthScore: number;  // 0–100
  userName: string;
}
