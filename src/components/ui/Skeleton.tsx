// ── Skeleton loader components ────────────────────────────────────────────────
import { cn } from '@/utils/helpers';

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'shimmer rounded-lg',
      className,
    )} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-[16px] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] p-5 bg-white dark:bg-[#0F172A] shadow-card">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-28 mb-2" />
      <Skeleton className="h-3 w-16 mt-2" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#E5E7EB] dark:border-white/10">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-32 mb-2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0F172A]">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-20 flex-shrink-0" />
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] p-4 space-y-3 bg-white dark:bg-[#0F172A]">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
