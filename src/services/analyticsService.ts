// ── Analytics Service ─────────────────────────────────────────────────────────
import apiClient from './api';
import type {
  AnalyticsSummary,
  CategoryBreakdown,
  MonthlyTrendPoint,
  AIInsight,
} from '@/types/analytics';

export const analyticsService = {
  async getSummary(): Promise<AnalyticsSummary> {
    const { data } = await apiClient.get<AnalyticsSummary>('/analytics/summary');
    return data;
  },

  async getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
    const { data } = await apiClient.get<CategoryBreakdown[]>('/analytics/categories');
    return data;
  },

  async getMonthlyTrend(): Promise<MonthlyTrendPoint[]> {
    const { data } = await apiClient.get<MonthlyTrendPoint[]>('/analytics/trend');
    return data;
  },

  async getInsights(): Promise<AIInsight[]> {
    const { data } = await apiClient.get<AIInsight[]>('/analytics/insights');
    return data;
  },
};
