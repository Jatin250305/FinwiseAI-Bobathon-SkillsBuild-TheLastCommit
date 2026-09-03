// ── Savings Goal types ───────────────────────────────────────────────────────
export type GoalCategory =
  | 'emergency_fund'
  | 'education'
  | 'travel'
  | 'laptop'
  | 'other';

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  deadline: string;        // ISO date
  monthlyContribution: number;
  status: 'active' | 'completed' | 'paused';
}

export interface CreateGoalRequest {
  name: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyContribution: number;
}

export interface UpdateGoalRequest extends Partial<CreateGoalRequest> {
  status?: 'active' | 'completed' | 'paused';
}
