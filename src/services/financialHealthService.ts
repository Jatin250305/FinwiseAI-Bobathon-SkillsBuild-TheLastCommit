// ── Financial Health Service ──────────────────────────────────────────────────
// The backend calculates the authoritative health score.
import apiClient from './api';
import type { FinancialHealth } from '@/types/financialHealth';

export const financialHealthService = {
  async get(): Promise<FinancialHealth> {
    const { data } = await apiClient.get<FinancialHealth>('/financial-health');
    return data;
  },
};
