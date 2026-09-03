// ── Budget types ─────────────────────────────────────────────────────────────
import type { TransactionCategory } from './transaction';

export type BudgetStatus = 'normal' | 'near_limit' | 'exceeded';

export interface Budget {
  id: string;
  category: TransactionCategory;
  budgetAmount: number;
  spentAmount: number;
  month: string;   // YYYY-MM
  status: BudgetStatus;
}

export interface CreateBudgetRequest {
  category: TransactionCategory;
  budgetAmount: number;
  month: string;
}
