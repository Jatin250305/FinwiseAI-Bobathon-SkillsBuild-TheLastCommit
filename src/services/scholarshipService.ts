// ── Scholarship Service ───────────────────────────────────────────────────────
import apiClient from './api';
import type {
  Scholarship,
  EligibilityCheckRequest,
  EligibilityResult,
} from '@/types/scholarship';

export const scholarshipService = {
  async getAll(): Promise<Scholarship[]> {
    const { data } = await apiClient.get<Scholarship[]>('/scholarships');
    return data;
  },

  async checkEligibility(request: EligibilityCheckRequest): Promise<EligibilityResult[]> {
    const { data } = await apiClient.post<EligibilityResult[]>('/scholarships/check-eligibility', request);
    return data;
  },
};
