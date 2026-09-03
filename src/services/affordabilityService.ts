// ── Affordability Service ─────────────────────────────────────────────────────
// The backend affordability engine does ALL calculations.
// Frontend sends input, displays result.
import apiClient from './api';
import type {
  AffordabilityCheckRequest,
  AffordabilityResult,
  AffordabilityRecord,
} from '@/types/affordability';

export const affordabilityService = {
  async check(request: AffordabilityCheckRequest): Promise<AffordabilityResult> {
    const { data } = await apiClient.post<AffordabilityResult>('/affordability/check', request);
    return data;
  },

  async getHistory(): Promise<AffordabilityRecord[]> {
    const { data } = await apiClient.get<AffordabilityRecord[]>('/affordability/history');
    return data;
  },

  async getRecord(id: string): Promise<AffordabilityRecord> {
    // Fetch from history and find by id (no dedicated single-record endpoint needed)
    const history = await this.getHistory();
    const record = history.find((r) => r.id === id);
    if (!record) throw new Error('Record not found');
    return record;
  },
};
