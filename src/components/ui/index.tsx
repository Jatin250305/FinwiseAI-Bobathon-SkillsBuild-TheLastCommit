// ── Shared UI components ──────────────────────────────────────────────────────
import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/helpers';

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={cn(
        'relative rounded-2xl shadow-modal w-full fade-in-fast',
        'bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-white/[0.08]',
        sizeClass,
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #0F172A, #4B5563)' }} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] dark:border-white/[0.08] mt-[2px]">
          <h2 id="modal-title" className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
            {title}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-white/8 transition-colors"
            aria-label="Close">
            <X className="w-4 h-4 text-[#9CA3AF] dark:text-white/35" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const ALERT_STYLES: Record<AlertVariant, { container: string; dark: string; icon: React.ReactNode }> = {
  info:    { container: 'bg-[#0F172A]/[0.06] border-[#0F172A]/20 text-[#0F172A]', dark: 'dark:bg-white/5 dark:border-white/10 dark:text-[#94A3B8]', icon: <Info className="w-4 h-4" /> },
  success: { container: 'bg-emerald-50 border-emerald-200 text-emerald-700', dark: 'dark:bg-emerald-900/20 dark:text-emerald-300', icon: <CheckCircle className="w-4 h-4" /> },
  warning: { container: 'bg-amber-50 border-amber-200 text-amber-700', dark: 'dark:bg-amber-900/20 dark:text-amber-300', icon: <AlertTriangle className="w-4 h-4" /> },
  error:   { container: 'bg-red-50 border-red-200 text-red-700', dark: 'dark:bg-red-900/20 dark:text-red-300', icon: <AlertCircle className="w-4 h-4" /> },
};

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className }: AlertProps) {
  const { container, dark, icon } = ALERT_STYLES[variant];
  return (
    <div role="alert" className={cn('flex items-start gap-2.5 border rounded-xl p-3 text-sm', container, dark, className)}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      {icon && (
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5
          bg-[#F3F4F6] dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10">
          <span className="text-[#9CA3AF] dark:text-[#475569]">{icon}</span>
        </div>
      )}
      <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F1F5F9] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  );
}

// ── LoadingState ──────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#E5E7EB] dark:border-white/10" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#0F172A] dark:border-t-white/60 animate-spin" />
      </div>
      <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8]">{message}</p>
    </div>
  );
}

// ── ErrorState ────────────────────────────────────────────────────────────────
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] dark:bg-white/5
        border border-[#E5E7EB] dark:border-white/10
        flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-500" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] mb-1">Unable to load data</p>
        <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] max-w-xs leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

// ── ConfirmationDialog ────────────────────────────────────────────────────────
interface ConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmationDialog({
  open, onConfirm, onCancel, title, description, confirmLabel = 'Confirm', danger,
}: ConfirmationDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-[#4B5563] dark:text-[#94A3B8] mb-6 leading-relaxed">{description}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button onClick={onConfirm}
          className={cn('btn-primary text-sm', danger && 'bg-red-600 hover:bg-red-700 hover:shadow-none')}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── BudgetProgress ────────────────────────────────────────────────────────────
import type { BudgetStatus } from '@/types/budget';
import { formatINR } from '@/utils/helpers';

// 4-tier visual thresholds (UI-layer only — BudgetStatus type stays 3-value):
//   0–79%   → Normal     (on track)
//   80–89%  → Near Limit (amber warning)
//   90–99%  → Critical   (orange/red — visual tier, derived from near_limit + high pct)
//   100%+   → Exceeded   (red)
// Threshold 80% keeps existing labels correct: Food 75% stays "On track", Shopping 80% stays "Near limit".

type VisualTier = 'normal' | 'near_limit' | 'critical' | 'exceeded';

function getVisualTier(status: BudgetStatus, pct: number): VisualTier {
  if (status === 'exceeded') return 'exceeded';
  if (status === 'near_limit' && pct >= 90) return 'critical';
  if (status === 'near_limit') return 'near_limit';
  return 'normal';
}

const TIER_CONFIG: Record<VisualTier, {
  label: string;
  pill: string;
  track: string;
  barLight: string;
  barDark: string;
  deltaColor: string;
  warningIcon?: string;
}> = {
  normal:     {
    label: 'On track',
    pill: 'bg-[#0F172A]/8 text-[#0F172A] dark:bg-white/8 dark:text-[#94A3B8]',
    track: 'bg-[#E5E7EB] dark:bg-white/10',
    barLight: '#0F172A', barDark: '#CBD5E1',
    deltaColor: 'text-[#9CA3AF] dark:text-[#94A3B8]',
  },
  near_limit: {
    label: 'Near limit',
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    track: 'bg-amber-100/60 dark:bg-amber-900/20',
    barLight: '#fbbf24', barDark: '#fbbf24',
    deltaColor: 'text-amber-600 dark:text-amber-400',
    warningIcon: '⚠️',
  },
  critical:   {
    label: 'Critical',
    pill: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    track: 'bg-orange-100/60 dark:bg-orange-900/20',
    barLight: '#f97316', barDark: '#fb923c',
    deltaColor: 'text-orange-600 dark:text-orange-400',
    warningIcon: '🚨',
  },
  exceeded:   {
    label: 'Exceeded',
    pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    track: 'bg-red-50 dark:bg-red-900/20',
    barLight: '#ef4444', barDark: '#f87171',
    deltaColor: 'text-red-600 dark:text-red-400',
    warningIcon: '🚨',
  },
};

interface BudgetProgressProps {
  label: string;
  spent: number;
  budget: number;
  status: BudgetStatus;
}

export function BudgetProgress({ label, spent, budget, status }: BudgetProgressProps) {
  const rawPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const pct = Math.min(100, rawPct);
  const tier = getVisualTier(status, rawPct);
  const config = TIER_CONFIG[tier];
  const prefersDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const barColor = prefersDark ? config.barDark : config.barLight;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#0F172A] dark:text-[#F1F5F9]">{label}</span>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.pill)}>
          {config.label}
        </span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden', config.track)}
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${label}: ${pct}% of budget used`}>
        <div className="h-full rounded-full progress-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">
          {formatINR(spent)} of {formatINR(budget)}
        </span>
        <span className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8]">{pct}%</span>
      </div>
      {/* Inline status line — consistent across all tiers */}
      {status === 'exceeded' ? (
        <p className={cn('text-xs font-medium', config.deltaColor)}>
          {config.warningIcon} Over by {formatINR(spent - budget)}
        </p>
      ) : tier === 'critical' ? (
        <p className={cn('text-xs font-medium', config.deltaColor)}>
          {config.warningIcon} {formatINR(budget - spent)} remaining — almost at limit
        </p>
      ) : tier === 'near_limit' ? (
        <p className={cn('text-xs font-medium', config.deltaColor)}>
          {config.warningIcon} {formatINR(budget - spent)} remaining
        </p>
      ) : (
        <p className={cn('text-xs', config.deltaColor)}>
          {formatINR(budget - spent)} remaining
        </p>
      )}
    </div>
  );
}

// ── GoalProgress ──────────────────────────────────────────────────────────────
interface GoalProgressProps {
  name: string;
  current: number;
  target: number;
  deadline: string;
  monthlyContribution: number;
}

export function GoalProgress({ name, current, target, deadline, monthlyContribution }: GoalProgressProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const remaining = target - current;
  // Detect dark mode for inline gradient — light stays unchanged
  const prefersDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const fillGradient = prefersDark
    ? 'linear-gradient(90deg, #CBD5E1, #94A3B8)'   // visible slate on dark cards
    : 'linear-gradient(90deg, #0F172A, #334155)';   // original dark navy on light

  // Encouragement: only show when meaningfully close or past half
  const encouragement =
    pct >= 100
      ? '🎉 Goal reached!'
      : remaining <= 2000
      ? `${formatINR(remaining)} to go — almost there!`
      : pct >= 50
      ? 'You\'re more than halfway there.'
      : null;

  return (
    <div className="space-y-2">
      {name && (
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">{name}</p>
          <p className="text-sm font-bold text-[#0F172A] dark:text-[#94A3B8] ml-2 flex-shrink-0">{pct}%</p>
        </div>
      )}
      <div className="h-1.5 bg-[#E5E7EB] dark:bg-white/10 rounded-full overflow-hidden"
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${name}: ${pct}% of goal reached`}>
        <div className="h-full rounded-full progress-fill"
          style={{ width: `${pct}%`, background: fillGradient }} />
      </div>
      <div className="flex justify-between text-xs text-[#9CA3AF] dark:text-[#94A3B8]">
        <span>{formatINR(current)} of {formatINR(target)}</span>
        <span>By {new Date(deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
      </div>
      {encouragement && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{encouragement}</p>
      )}
      {!encouragement && monthlyContribution > 0 && (
        <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">
          ₹{monthlyContribution.toLocaleString('en-IN')}/month contribution
        </p>
      )}
    </div>
  );
}
