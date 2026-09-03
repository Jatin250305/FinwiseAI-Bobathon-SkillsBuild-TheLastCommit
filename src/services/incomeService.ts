// ── Income Service ────────────────────────────────────────────────────────────
import apiClient from './api';
import type { IncomeSummary, DashboardSummary, IncomeSource } from '@/types/income';

export const incomeService = {
  async getSummary(month?: string): Promise<IncomeSummary> {
    const params = month ? { month } : {};
    const { data } = await apiClient.get<IncomeSummary>('/income/summary', { params });
    return data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return data;
  },

  async createSource(payload: { type: IncomeSource['type']; label: string; amount: number; month: string }): Promise<IncomeSource> {
    const { data } = await apiClient.post<IncomeSource>('/income/sources', payload);
    return data;
  },

  async updateSource(id: string, payload: { type?: IncomeSource['type']; label?: string; amount?: number }): Promise<IncomeSource> {
    const { data } = await apiClient.put<IncomeSource>(`/income/sources/${id}`, payload);
    return data;
  },

  async deleteSource(id: string): Promise<void> {
    await apiClient.delete(`/income/sources/${id}`);
  },
};
