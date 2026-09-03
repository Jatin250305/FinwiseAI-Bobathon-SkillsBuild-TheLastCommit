// ── Analytics types ──────────────────────────────────────────────────────────
import type { TransactionCategory } from './transaction';

export interface AnalyticsSummary {
  currentMonthIncome: number;
  previousMonthIncome: number;
  incomeChange: number;           // percentage
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  expensesChange: number;         // percentage
}

export interface CategoryBreakdown {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  previousAmount?: number;
}

export interface MonthlyTrendPoint {
  month: string;   // e.g. "Jan", "Feb"
  income: number;
  expenses: number;
  savings: number;
}

export interface AIInsight {
  id: string;
  type: 'spending_insight' | 'saving_insight' | 'warning' | 'recommendation';
  title: string;
  message: string;
  generatedAt: string;
}
