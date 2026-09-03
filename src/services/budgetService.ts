// ── Budget Service ────────────────────────────────────────────────────────────
import apiClient from './api';
import type { Budget, CreateBudgetRequest } from '@/types/budget';

export const budgetService = {
  async getAll(month?: string): Promise<Budget[]> {
    const params = month ? { month } : {};
    const { data } = await apiClient.get<Budget[]>('/budgets', { params });
    return data;
  },

  async create(data: CreateBudgetRequest): Promise<Budget> {
    const { data: created } = await apiClient.post<Budget>('/budgets', data);
    return created;
  },

  async update(id: string, data: Partial<CreateBudgetRequest>): Promise<Budget> {
    const { data: updated } = await apiClient.put<Budget>(`/budgets/${id}`, data);
    return updated;
  },
};
