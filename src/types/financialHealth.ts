// ── Financial Health types ───────────────────────────────────────────────────
export interface HealthMetric {
  label: string;
  score: number;   // 0–100
  weight: number;  // contribution to overall
  description: string;
}

export interface FinancialHealth {
  overallScore: number;   // 0–100
  metrics: {
    savingsRate: HealthMetric;
    budgetAdherence: HealthMetric;
    spendingStability: HealthMetric;
    debtBurden: HealthMetric;
    goalProgress: HealthMetric;
    emergencyReserve: HealthMetric;
  };
  previousScore: number;
  scoreChange: number;
  aiExplanation: string;
  generatedAt: string;
}
