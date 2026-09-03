// ── Goals Service ─────────────────────────────────────────────────────────────
import apiClient from './api';
import type { Goal, CreateGoalRequest, UpdateGoalRequest } from '@/types/goal';

export const goalService = {
  async getAll(): Promise<Goal[]> {
    const { data } = await apiClient.get<Goal[]>('/goals');
    return data;
  },

  async create(data: CreateGoalRequest): Promise<Goal> {
    const { data: created } = await apiClient.post<Goal>('/goals', data);
    return created;
  },

  async update(id: string, data: UpdateGoalRequest): Promise<Goal> {
    const { data: updated } = await apiClient.put<Goal>(`/goals/${id}`, data);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/goals/${id}`);
  },
};
