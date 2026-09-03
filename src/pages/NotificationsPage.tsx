// ── Notifications Page ─────────────────────────────────────────────────────────
// All notifications are fetched from the backend — none are hardcoded.
// Every row corresponds to a real event (transaction recorded, budget alert, etc.)
import { useEffect, useState, useCallback } from 'react';
import {
  Bell, AlertTriangle, TrendingUp, Target, Info, CheckCheck,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/index';
import type { Notification, NotificationType } from '@/types/notification';
import toast from 'react-hot-toast';

// ── Icon + style config per notification type ────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, {
  Icon: React.ElementType;
  iconColor: string;
  bg: string;
}> = {
  budget_alert: {
    Icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/30',
  },
  transaction: {
    Icon: TrendingUp,
    iconColor: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/30',
  },
  goal: {
    Icon: Target,
    iconColor: 'text-[#0F172A] dark:text-[#94A3B8]',
    bg: 'bg-[#0F172A]/8 dark:bg-[#0F172A]/15 border-[#0F172A]/20 dark:border-white/10',
  },
  system: {
    Icon: Info,
    iconColor: 'text-[#4B5563] dark:text-[#94A3B8]',
    bg: 'bg-[#F3F4F6] dark:bg-white/5 border-[#E5E7EB] dark:border-white/8',
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch {
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await notificationService.markRead(id);
    } catch {
      // Revert on failure
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  if (loading) return <LoadingState message="Loading notifications..." />;
  if (error) return <ErrorState message={error} onRetry={fetchNotifications} />;

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between page-header">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="page-subtitle">
            {unread > 0
              ? `${unread} unread notification${unread !== 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Notification list */}
      <FinancialCard title="Recent Notifications">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title="You're all caught up"
            description="No notifications yet. They'll appear here when you record transactions, hit budget limits, or reach savings goals."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
              const { Icon, iconColor, bg } = cfg;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150
                    hover:-translate-y-0.5 hover:shadow-card
                    ${n.isRead
                      ? 'opacity-55 bg-transparent border-transparent hover:opacity-75 hover:border-[#E5E7EB] dark:hover:border-white/8'
                      : bg
                    }`}
                  aria-label={n.isRead ? n.title : `Mark as read: ${n.title}`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                    ${n.isRead ? 'bg-[#F3F4F6] dark:bg-white/8' : 'bg-white/60 dark:bg-black/20'}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{n.title}</p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-[#0F172A] dark:bg-white/70" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </FinancialCard>

      {/* Notification Preferences (static UI — backend preferences not yet implemented) */}
      <FinancialCard title="Notification Preferences">
        <div className="space-y-1">
          {[
            { label: 'Budget alerts', desc: 'When a budget category reaches 80% or is exceeded' },
            { label: 'Transaction confirmations', desc: 'When income or expenses are recorded' },
            { label: 'Savings goal updates', desc: 'When a savings goal milestone is reached' },
            { label: 'Monthly summary', desc: 'Monthly financial health digest' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-[#E5E7EB] dark:border-white/8 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">{item.label}</p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">{item.desc}</p>
              </div>
              <label
                className="relative inline-flex items-center cursor-pointer flex-shrink-0"
                aria-label={`Toggle ${item.label}`}
              >
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-zinc-200 dark:bg-white/20 peer-checked:bg-[#0F172A] rounded-full transition-colors duration-200" />
                <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform duration-200" />
              </label>
            </div>
          ))}
        </div>
      </FinancialCard>
    </div>
  );
}
