// ── Scholarship types ────────────────────────────────────────────────────────
export type EligibilityStatus =
  | 'likely_eligible'
  | 'may_not_be_eligible'
  | 'more_information_required';

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  amount: number;
  eligibilityDescription: string;
  academicRequirements: string;
  incomeRequirements: string;
  deadline: string;
  requiredDocuments: string[];
  applicationStatus?: 'not_applied' | 'applied' | 'approved' | 'rejected';
  officialUrl: string;
  category?: string;
  academicLevel?: string;
}

export interface EligibilityCheckRequest {
  course: string;
  year: number;
  cgpa: number;
  familyIncome: number;
  location: string;
  category?: string;
}

export interface EligibilityResult {
  scholarship: {
    name: string;
    provider: string;
    amount: number;
    deadline: string;
  };
  eligibility: {
    status: EligibilityStatus;
    explanation: string;
    matchingCriteria: string[];
  };
  source: {
    title: string;
    url: string;
    publisher: string;
  };
  relevance?: number;
}
