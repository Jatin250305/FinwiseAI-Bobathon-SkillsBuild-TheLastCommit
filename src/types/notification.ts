// ── Notification types ────────────────────────────────────────────────────────

export type NotificationType =
  | 'transaction'
  | 'budget_alert'
  | 'goal'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  transactionId?: string;
  isRead: boolean;
  createdAt: string;   // ISO 8601
}

export interface UnreadCount {
  count: number;
}
