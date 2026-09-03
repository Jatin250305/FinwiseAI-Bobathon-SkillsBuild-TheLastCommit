// ── Loan Service ──────────────────────────────────────────────────────────────
// All financial values (EMI, interest, total repayment) come from the backend.
import apiClient from './api';
import type { Loan, LoanUsage } from '@/types/loan';

export const loanService = {
  async getAll(): Promise<Loan[]> {
    const { data } = await apiClient.get<Loan[]>('/loans');
    return data;
  },

  async getById(id: string): Promise<Loan> {
    const { data } = await apiClient.get<Loan>(`/loans/${id}`);
    return data;
  },

  async getUsage(loanId: string): Promise<LoanUsage> {
    const { data } = await apiClient.get<LoanUsage>(`/loans/${loanId}/usage`);
    return data;
  },
};
