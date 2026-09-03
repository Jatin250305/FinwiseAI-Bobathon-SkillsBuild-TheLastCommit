// ── AI Insight Card ───────────────────────────────────────────────────────────
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/utils/helpers';
import type { AIInsight } from '@/types/analytics';

const INSIGHT_CONFIG = {
  spending_insight: {
    icon: TrendingDown,
    label: 'Spending Insight',
    colors: 'bg-[#0F172A]/[0.06] border-[#0F172A]/20 dark:bg-[#1E293B] dark:border-white/[0.12]',
    iconBg: 'bg-[#0F172A]/12 dark:bg-white/10',
    iconColor: 'text-[#0F172A] dark:text-[#94A3B8]',
    labelColor: 'text-[#0F172A] dark:text-[#94A3B8]',
  },
  saving_insight: {
    icon: TrendingUp,
    label: 'Saving Insight',
    colors: 'bg-[#F9FAFB] border-[#E5E7EB] dark:bg-white/5 dark:border-white/10',
    iconBg: 'bg-[#F3F4F6] dark:bg-white/10',
    iconColor: 'text-[#0F172A] dark:text-[#F1F5F9]',
    labelColor: 'text-[#0F172A] dark:text-[#F1F5F9]',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    colors: 'bg-amber-50 border-amber-200 dark:bg-amber-900/15 dark:border-amber-700/25',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    labelColor: 'text-amber-700 dark:text-amber-400',
  },
  recommendation: {
    icon: Lightbulb,
    label: 'Recommendation',
    colors: 'bg-[#F9FAFB] border-[#E5E7EB] dark:bg-white/4 dark:border-white/8',
    iconBg: 'bg-[#F3F4F6] dark:bg-white/10',
    iconColor: 'text-[#0F172A] dark:text-[#94A3B8]',
    labelColor: 'text-[#0F172A] dark:text-[#94A3B8]',
  },
};

interface AIInsightCardProps {
  insight: AIInsight;
  compact?: boolean;
}

export function AIInsightCard({ insight, compact }: AIInsightCardProps) {
  const config = INSIGHT_CONFIG[insight.type];
  const Icon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border p-3.5 space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card',
      config.colors,
    )}>
      <div className="flex items-center gap-2">
        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', config.iconBg)}>
          <Icon className={cn('w-3 h-3', config.iconColor)} aria-hidden />
        </div>
        <span className={cn('text-[10px] font-bold uppercase tracking-[0.1em]', config.labelColor)}>
          {config.label}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#9CA3AF] dark:text-[#94A3B8] ml-auto">
          <Sparkles className="w-2.5 h-2.5" aria-hidden /> AI
        </span>
      </div>
      {!compact && (
        <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{insight.title}</p>
      )}
      <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">{insight.message}</p>
    </div>
  );
}
