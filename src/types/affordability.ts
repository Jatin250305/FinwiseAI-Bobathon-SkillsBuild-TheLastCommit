// ── Affordability types ──────────────────────────────────────────────────────
export type AffordabilityRecommendation =
  | 'comfortable'
  | 'proceed_with_caution'
  | 'not_recommended';

export interface AffordabilityCheckRequest {
  itemName: string;
  itemPrice: number;
  category: string;
  isRecurring: boolean;
}

export interface AffordabilityResult {
  recommendation: AffordabilityRecommendation;
  itemPrice: number;
  availableBalance: number;
  expectedMonthlyExpenses: number;
  upcomingObligations: number;
  savingsGoalContribution: number;
  estimatedDisposableAmount: number;
  aiExplanation: string;
}

export interface AffordabilityRecord {
  id: string;
  itemName: string;
  itemPrice: number;
  category: string;
  isRecurring: boolean;
  date: string;
  recommendation: AffordabilityRecommendation;
  result: AffordabilityResult;
}
