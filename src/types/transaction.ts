// ── Transaction types ────────────────────────────────────────────────────────
export type TransactionCategory =
  | 'education'
  | 'food'
  | 'shopping'
  | 'healthcare'
  | 'transportation'
  | 'accommodation'
  | 'entertainment'
  | 'utilities'
  | 'personal'
  | 'other';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'loan'
  | 'scholarship'
  | 'savings';

export type PaymentMethod =
  | 'upi'
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'other';

export interface Transaction {
  id: string;
  date: string;           // ISO 8601
  description: string;
  category: TransactionCategory;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  source?: string;
  loanId?: string;
  scholarshipId?: string;
  notes?: string;
}

export interface TransactionFilters {
  search?: string;
  category?: TransactionCategory | '';
  type?: TransactionType | '';
  dateFrom?: string;
  dateTo?: string;
  loanId?: string;
}

export interface CreateTransactionRequest {
  date: string;
  description: string;
  category: TransactionCategory;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  source?: string;
  loanId?: string;
  scholarshipId?: string;
  notes?: string;
}
