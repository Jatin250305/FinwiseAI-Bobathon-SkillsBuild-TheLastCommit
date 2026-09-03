import React from 'react';
import { cn } from '@/utils/helpers';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  accent?: boolean;  // deep navy hero card
  soft?: boolean;    // subtle tinted card
  hero?: boolean;    // larger value text — the one number to read first
  className?: string;
}

export function StatCard({
  title, value, subtitle, icon, trend, accent, soft, hero, className,
}: StatCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-[16px] p-5 border transition-all duration-200',
      'hover:-translate-y-0.5 hover:shadow-card-hover group',
      accent
        ? [
            'text-white',
            'border-[#1E293B]/80 dark:border-white/10',
          ].join(' ')
        : soft
        ? 'bg-[#F9FAFB] dark:bg-[#1E293B]/60 border-[#E5E7EB] dark:border-white/8'
        : 'bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-white/8',
      'shadow-card',
      className,
    )}
    style={accent ? {
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #253347 100%)',
      boxShadow: '0 4px 24px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.08)',
    } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={cn(
          'text-[11px] font-semibold uppercase tracking-wider',
          accent ? 'text-white/50' : soft ? 'text-[#4B5563] dark:text-[#94A3B8]' : 'text-[#9CA3AF] dark:text-[#94A3B8]',
        )}>
          {title}
        </p>
        {icon && (
          <span className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
            'transition-transform duration-200 group-hover:scale-105',
            accent
              ? 'bg-white/10'
              : soft
              ? 'bg-[#E5E7EB] dark:bg-white/10'
              : 'bg-[#F3F4F6] dark:bg-white/8',
          )}>
            <span className={cn(
              accent ? 'text-white/80' : 'text-[#4B5563] dark:text-[#94A3B8]',
            )}>
              {icon}
            </span>
          </span>
        )}
      </div>

      <p className={cn(
        'font-bold tracking-tight leading-none mb-1',
        hero ? 'text-3xl' : 'text-2xl',
        accent ? 'text-white' : 'text-[#0F172A] dark:text-[#F1F5F9]',
      )}>
        {value}
      </p>

      {subtitle && (
        <p className={cn(
          'text-xs mt-1.5',
          accent ? 'text-white/45' : 'text-[#9CA3AF] dark:text-[#94A3B8]',
        )}>
          {subtitle}
        </p>
      )}

      {trend && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-semibold',
          trend.value >= 0
            ? accent ? 'text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'
            : accent ? 'text-red-300' : 'text-red-500 dark:text-red-400',
        )}>
          <span className="text-[10px]">{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}

      {/* Decorative orb — only on accent */}
      {accent && (
        <>
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full
            bg-white/[0.04] pointer-events-none" />
          <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full
            bg-white/[0.03] pointer-events-none" />
        </>
      )}
    </div>
  );
}
