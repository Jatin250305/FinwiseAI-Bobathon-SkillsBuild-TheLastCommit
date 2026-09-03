// ── Loan types ───────────────────────────────────────────────────────────────
export interface Loan {
  id: string;
  name: string;
  principalAmount: number;
  amountUsed: number;
  remainingLoan: number;
  interestRate: number;    // percentage
  tenureMonths: number;
  emi: number;             // provided by backend
  totalRepayment: number;  // provided by backend
  totalInterest: number;   // provided by backend
  loanStartDate: string;
  repaymentStartDate: string;
  status: 'active' | 'closed' | 'pending';
}

export interface LoanUsageBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface LoanUsage {
  loanId: string;
  totalUsed: number;
  breakdown: LoanUsageBreakdown[];
  aiExplanation?: string;
}
