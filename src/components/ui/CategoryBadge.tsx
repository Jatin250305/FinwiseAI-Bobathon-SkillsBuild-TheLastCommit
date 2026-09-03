import { cn, capitalize } from '@/utils/helpers';
import type { TransactionCategory, TransactionType } from '@/types/transaction';

// Navy/slate toned category colors — subtle & Apple-like
const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  education:      'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  food:           'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',
  shopping:       'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  healthcare:     'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
  transportation: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
  accommodation:  'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-300',
  entertainment:  'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  utilities:      'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-300',
  personal:       'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
  other:          'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
};

const TYPE_COLORS: Record<TransactionType, string> = {
  income:      'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  expense:     'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  loan:        'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300',
  scholarship: 'bg-[#0F172A]/8 text-[#0F172A] dark:bg-white/8 dark:text-[#E2E8F0]',
  savings:     'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
};

interface CategoryBadgeProps {
  category?: TransactionCategory;
  type?: TransactionType;
  className?: string;
}

export function CategoryBadge({ category, type, className }: CategoryBadgeProps) {
  if (type) {
    return <span className={cn('badge', TYPE_COLORS[type], className)}>{capitalize(type)}</span>;
  }
  if (category) {
    return <span className={cn('badge', CATEGORY_COLORS[category], className)}>{capitalize(category)}</span>;
  }
  return null;
}
