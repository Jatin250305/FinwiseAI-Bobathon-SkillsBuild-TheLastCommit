// ── AI Service ────────────────────────────────────────────────────────────────
// Frontend sends structured requests; backend handles LLM, financial tools, RAG.
import apiClient from './api';
import type { AIChatRequest, AIChatResponse, Conversation } from '@/types/ai';

export const aiService = {
  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const { data } = await apiClient.post<AIChatResponse>('/ai/chat', request);
    return data;
  },

  async getConversations(): Promise<Conversation[]> {
    const { data } = await apiClient.get<Conversation[]>('/ai/conversations');
    return data;
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/ai/conversations/${id}`);
  },
};
