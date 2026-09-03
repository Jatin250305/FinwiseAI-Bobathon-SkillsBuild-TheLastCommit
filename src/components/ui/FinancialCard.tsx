import React from 'react';
import { cn } from '@/utils/helpers';

interface FinancialCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  headerBorder?: boolean;
  compact?: boolean;
  glass?: boolean;
  dark?: boolean;
}

export function FinancialCard({
  title, children, action, className, headerBorder = true, compact, glass, dark,
}: FinancialCardProps) {
  return (
    <div className={cn(
      glass
        ? 'rounded-[16px] border p-5 backdrop-blur-md transition-all duration-200 hover:shadow-card-hover'
        : 'card transition-all duration-200 hover:shadow-card-hover',
      glass && !dark && 'bg-white/80 border-white/40 shadow-glass',
      glass && dark && 'bg-[#1E293B]/90 border-white/10 shadow-glass-navy text-white',
      className,
    )}>
      <div className={cn(
        'flex items-center justify-between',
        headerBorder ? 'pb-3.5 mb-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08]' : 'mb-3.5',
        compact && 'pb-2.5 mb-2.5',
        glass && dark && 'border-white/10',
      )}>
        <h3 className={cn(
          'text-sm font-semibold',
          dark ? 'text-white' : 'text-[#0F172A] dark:text-[#F1F5F9]',
        )}>
          {title}
        </h3>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
