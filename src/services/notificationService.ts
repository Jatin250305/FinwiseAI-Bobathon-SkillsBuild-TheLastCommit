// ── Notification Service ──────────────────────────────────────────────────────
import apiClient from './api';
import type { Notification, UnreadCount } from '@/types/notification';

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const { data } = await apiClient.get<Notification[]>('/notifications');
    return data;
  },

  async getUnreadCount(): Promise<UnreadCount> {
    const { data } = await apiClient.get<UnreadCount>('/notifications/unread-count');
    return data;
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
