// ── Budget Page ───────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Plus, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { budgetService } from '@/services/budgetService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { Modal, LoadingState, ErrorState, BudgetProgress } from '@/components/ui/index';
import { formatINR, capitalize, getCurrentMonth, getCurrentMonthLabel } from '@/utils/helpers';
import type { Budget } from '@/types/budget';
import type { TransactionCategory } from '@/types/transaction';

const CATEGORIES: TransactionCategory[] = [
  'food','shopping','transportation','entertainment','education','healthcare','accommodation','utilities','personal','other'
];

const budgetSchema = z.object({
  category: z.enum(['education','food','shopping','healthcare','transportation','accommodation','entertainment','utilities','personal','other']),
  budgetAmount: z.coerce.number().positive('Budget must be positive'),
});
type BudgetForm = z.infer<typeof budgetSchema>;

const MONTH = getCurrentMonth();

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const data = await budgetService.getAll(MONTH);
      setBudgets(data);
    } catch {
      setError('Unable to load budgets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBudgets(); }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { category: 'food' },
  });

  const onSubmit = async (data: BudgetForm) => {
    try {
      await budgetService.create({ ...data, month: MONTH });
      toast.success('Budget created');
      setShowAdd(false);
      reset();
      fetchBudgets();
    } catch {
      toast.error('Failed to create budget');
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spentAmount, 0);
  const exceeded = budgets.filter((b) => b.status === 'exceeded').length;
  // Critical = near_limit AND pct >= 90 (mirrors BudgetProgress visual tier logic)
  const critical = budgets.filter((b) => b.status === 'near_limit' && b.budgetAmount > 0 && b.spentAmount / b.budgetAmount >= 0.9).length;
  const nearLimit = budgets.filter((b) => b.status === 'near_limit').length - critical;
  const healthPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (loading) return <LoadingState message="Loading budgets..." />;
  if (error) return <ErrorState message={error} onRetry={fetchBudgets} />;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between page-header">
        <div>
          <h2 className="page-title">Budget</h2>
          <p className="page-subtitle">{getCurrentMonthLabel()}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Budget
        </button>
      </div>

      {/* Hero overview */}
      <div className="relative rounded-[20px] overflow-hidden p-6 border border-[#0F172A]/30 dark:border-white/8"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,201,207,0.15) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1">Budget Overview</p>
            <p className="text-3xl font-bold text-white">{formatINR(totalSpent)}</p>
            <p className="text-sm text-white/50 mt-1">spent of {formatINR(totalBudget)} total</p>
          </div>
          {/* Circular progress indicator */}
          <div className="flex-shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`${healthPct}% of budget used`} role="img">
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <circle
                cx="36" cy="36" r="28" fill="none"
                stroke={healthPct > 90 ? '#f87171' : healthPct > 75 ? '#fbbf24' : 'rgba(255,255,255,0.85)'}
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - healthPct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
              />
              <text x="36" y="39" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">{healthPct}%</text>
            </svg>
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="relative z-10 mt-4">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, healthPct)}%`,
                background: healthPct > 90 ? '#f87171' : healthPct > 75 ? '#fbbf24' : 'rgba(255,255,255,0.75)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary cards — 4 statuses: On track / Near limit / Critical / Exceeded */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="w-4 h-4 text-[#0F172A] dark:text-[#94A3B8]" />
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Total Budget</p>
          </div>
          <p className="text-xl font-bold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(totalBudget)}</p>
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-1">{formatINR(totalBudget - totalSpent)} remaining</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Total Spent</p>
          </div>
          <p className="text-xl font-bold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(totalSpent)}</p>
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-1">{healthPct}% of budget used</p>
        </div>
        <div className={`card ${(exceeded > 0 || critical > 0) ? 'border-l-[3px] border-l-red-400' : ''}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {exceeded > 0 || critical > 0
              ? <AlertTriangle className="w-4 h-4 text-red-500" />
              : <CheckCircle className="w-4 h-4 text-emerald-600" />}
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Alerts</p>
          </div>
          <p className={`text-xl font-bold ${exceeded > 0 ? 'text-red-600 dark:text-red-400' : critical > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {exceeded > 0 ? `${exceeded} exceeded` : critical > 0 ? `${critical} critical` : 'All good'}
          </p>
        </div>
        <div className={`card ${nearLimit > 0 ? 'border-l-[3px] border-l-amber-400' : ''}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {nearLimit > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Near Limit</p>
          </div>
          <p className={`text-xl font-bold ${nearLimit > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#0F172A] dark:text-[#E2E8F0]'}`}>
            {nearLimit > 0 ? `${nearLimit} categor${nearLimit === 1 ? 'y' : 'ies'}` : 'None'}
          </p>
        </div>
      </div>

      {/* Budget progress list */}
      <FinancialCard title="Category Budgets">
        <div className="space-y-5">
          {budgets.map((b) => (
            <BudgetProgress
              key={b.id}
              label={capitalize(b.category)}
              spent={b.spentAmount}
              budget={b.budgetAmount}
              status={b.status}
            />
          ))}
        </div>
      </FinancialCard>

      {/* Add Budget Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset(); }} title="Add Budget" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select {...register('category')} className="input">
              {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Monthly Budget (₹)</label>
            <input type="number" step="100" {...register('budgetAmount')} className="input" placeholder="e.g. 5000" />
            {errors.budgetAmount && <p className="text-xs text-red-600 mt-1">{errors.budgetAmount.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); reset(); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">Add Budget</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
