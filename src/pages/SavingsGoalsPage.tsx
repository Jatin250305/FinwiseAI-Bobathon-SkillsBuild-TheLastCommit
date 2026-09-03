// ── Savings Goals Page ────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Plus, CheckCircle, PiggyBank, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { goalService } from '@/services/goalService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { Modal, LoadingState, ErrorState, GoalProgress, ConfirmationDialog, EmptyState } from '@/components/ui/index';
import { formatINR, capitalize } from '@/utils/helpers';
import type { Goal, GoalCategory } from '@/types/goal';

const GOAL_CATEGORIES: GoalCategory[] = ['emergency_fund','education','travel','laptop','other'];

const goalSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.enum(['emergency_fund','education','travel','laptop','other']),
  targetAmount: z.coerce.number().positive('Target must be positive'),
  currentAmount: z.coerce.number().min(0),
  deadline: z.string().min(1, 'Deadline is required'),
  monthlyContribution: z.coerce.number().min(0),
});
type GoalForm = z.infer<typeof goalSchema>;

const CATEGORY_EMOJIS: Record<GoalCategory, string> = {
  emergency_fund: '🛡️', education: '📚', travel: '✈️', laptop: '💻', other: '🎯',
};

const CATEGORY_COLORS: Record<GoalCategory, { bg: string; border: string; text: string }> = {
  emergency_fund: { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300' },
  education:      { bg: 'bg-[#F9FAFB] dark:bg-white/5', border: 'border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]', text: 'text-[#0F172A] dark:text-[#E2E8F0]' },
  travel:         { bg: 'bg-amber-50 dark:bg-amber-900/15', border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-700 dark:text-amber-300' },
  laptop:         { bg: 'bg-[#E2E8F0]/20 dark:bg-[#E2E8F0]/10', border: 'border-[#E2E8F0] dark:border-[#E2E8F0]/30', text: 'text-[#0F172A] dark:text-[#E2E8F0]' },
  other:          { bg: 'bg-[#F9FAFB] dark:bg-white/5', border: 'border-[#E5E7EB] dark:border-white/10', text: 'text-[#52525B] dark:text-[#94A3B8]' },
};

// ── Contribution form schema ──────────────────────────────────────────────────
const contributeSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount too large'),
});
type ContributeForm = z.infer<typeof contributeSchema>;

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Contribution modal state
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeLoading, setContributeLoading] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    try { setGoals(await goalService.getAll()); }
    catch { setError('Unable to load savings goals.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { category: 'emergency_fund', currentAmount: 0, monthlyContribution: 2000 },
  });

  const {
    register: registerContribute,
    handleSubmit: handleContributeSubmit,
    reset: resetContribute,
    watch: watchContribute,
    formState: { errors: contributeErrors },
  } = useForm<ContributeForm>({ resolver: zodResolver(contributeSchema) });

  const contributeAmount = watchContribute('amount');

  const onSubmit = async (data: GoalForm) => {
    try {
      await goalService.create(data);
      toast.success('Goal created!');
      setShowAdd(false);
      reset();
      fetchGoals();
    } catch {
      toast.error('Failed to create goal');
    }
  };

  const openContribute = (goal: Goal) => {
    setContributeGoal(goal);
    resetContribute();
  };

  const onContribute = async (data: ContributeForm) => {
    if (!contributeGoal) return;
    setContributeLoading(true);
    try {
      const newAmount = contributeGoal.currentAmount + data.amount;
      const willComplete = newAmount >= contributeGoal.targetAmount;
      await goalService.update(contributeGoal.id, {
        currentAmount: newAmount,
        ...(willComplete ? { status: 'completed' } : {}),
      });
      if (willComplete) {
        toast.success(`🎉 Goal "${contributeGoal.name}" completed!`);
      } else {
        toast.success(`₹${data.amount.toLocaleString('en-IN')} added to ${contributeGoal.name}`);
      }
      setContributeGoal(null);
      resetContribute();
      fetchGoals();
    } catch {
      toast.error('Failed to add contribution. Please try again.');
    } finally {
      setContributeLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await goalService.delete(deleteId);
      toast.success('Goal deleted');
      setDeleteId(null);
      fetchGoals();
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = active.reduce((s, g) => s + g.currentAmount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (loading) return <LoadingState message="Loading savings goals..." />;
  if (error) return <ErrorState message={error} onRetry={fetchGoals} />;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between page-header">
        <div>
          <h2 className="page-title">Savings Goals</h2>
          <p className="page-subtitle">{active.length} active goals · {formatINR(totalSaved)} saved of {formatINR(totalTarget)}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Hero summary */}
      {(active.length > 0 || completed.length > 0) && (
        <div className="relative rounded-[20px] overflow-hidden p-6 border border-[#0F172A]/30 dark:border-white/8"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(232,201,207,0.2) 0%, transparent 70%)' }} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1">Overall Progress</p>
              <p className="text-3xl font-bold text-white">{formatINR(totalSaved)}</p>
              <p className="text-sm text-white/50 mt-1">saved toward {formatINR(totalTarget)} total</p>
            </div>
            <div className="flex-shrink-0 text-center">
              <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`${overallPct}% of goals completed`} role="img">
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="36" cy="36" r="28" fill="none"
                  stroke="#E2E8F0" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - overallPct / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="39" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">{overallPct}%</text>
              </svg>
              <p className="text-[10px] text-white/40 mt-1">{completed.length} completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 ? (
        <FinancialCard title="Active Goals">
          <div className="grid sm:grid-cols-2 gap-4">
            {active.map((goal) => {
              const colors = CATEGORY_COLORS[goal.category];
              return (
                <div key={goal.id} className={`p-4 rounded-xl border space-y-3 hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 ${colors.bg} ${colors.border}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                        {CATEGORY_EMOJIS[goal.category]}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${colors.text}`}>{goal.name}</p>
                        <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] capitalize">{goal.category.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openContribute(goal)}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-[#0F172A] dark:text-[#E2E8F0] transition-colors border border-black/10 dark:border-white/10"
                        aria-label={`Add money to ${goal.name}`}
                      >
                        <PlusCircle className="w-3 h-3" aria-hidden />
                        Add
                      </button>
                      <button
                        onClick={() => setDeleteId(goal.id)}
                        className="text-[#C8B0A8] hover:text-red-500 transition-colors text-xs p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label={`Delete ${goal.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <GoalProgress
                    name=""
                    current={goal.currentAmount}
                    target={goal.targetAmount}
                    deadline={goal.deadline}
                    monthlyContribution={goal.monthlyContribution}
                  />
                </div>
              );
            })}
          </div>
        </FinancialCard>
      ) : (
        <EmptyState
          icon={<PiggyBank className="w-7 h-7" />}
          title="Set your first financial goal"
          description="Save for a laptop, emergency fund, travel, or education. Start building your future today."
          action={<button onClick={() => setShowAdd(true)} className="btn-primary text-sm">Create Your First Goal</button>}
        />
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <FinancialCard title="Completed Goals">
          <div className="space-y-2">
            {completed.map((goal) => (
              <div key={goal.id}
                className="flex items-center gap-3 py-3 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800/30">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                </div>
                <span className="flex items-center gap-2 text-sm flex-1 min-w-0">
                  <span>{CATEGORY_EMOJIS[goal.category]}</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0] truncate">{goal.name}</span>
                </span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">{formatINR(goal.targetAmount)}</span>
              </div>
            ))}
          </div>
        </FinancialCard>
      )}

      {/* Add Goal Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset(); }} title="New Savings Goal" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Goal Name</label>
            <input type="text" {...register('name')} className="input" placeholder="e.g. Emergency Fund" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input">
                {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" {...register('deadline')} className="input" />
              {errors.deadline && <p className="text-xs text-red-600 mt-1">{errors.deadline.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Amount (₹)</label>
              <input type="number" step="1000" {...register('targetAmount')} className="input" placeholder="50000" />
              {errors.targetAmount && <p className="text-xs text-red-600 mt-1">{errors.targetAmount.message}</p>}
            </div>
            <div>
              <label className="label">Current Amount (₹)</label>
              <input type="number" step="500" {...register('currentAmount')} className="input" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">Monthly Contribution (₹)</label>
            <input type="number" step="500" {...register('monthlyContribution')} className="input" placeholder="2000" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); reset(); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">Create Goal</button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        open={!!contributeGoal}
        onClose={() => { setContributeGoal(null); resetContribute(); }}
        title={`Add to ${contributeGoal?.name ?? ''}`}
        size="sm"
      >
        {contributeGoal && (
          <form onSubmit={handleContributeSubmit(onContribute)} className="space-y-4">
            {/* Progress context */}
            <div className="rounded-xl bg-[#F7F8FA] dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Saved so far</span>
                <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(contributeGoal.currentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Target</span>
                <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(contributeGoal.targetAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Remaining</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatINR(Math.max(0, contributeGoal.targetAmount - contributeGoal.currentAmount))}
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 rounded-full bg-[#E5E7EB] dark:bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-[#0F172A] dark:bg-[#E2E8F0] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((contributeGoal.currentAmount / contributeGoal.targetAmount) * 100))}%` }}
                />
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="label">Amount to add (₹)</label>
              <input
                type="number"
                step="100"
                min="1"
                {...registerContribute('amount')}
                className="input text-lg font-semibold"
                placeholder="e.g. 5000"
                autoFocus
              />
              {contributeErrors.amount && (
                <p className="text-xs text-red-600 mt-1" role="alert">{contributeErrors.amount.message}</p>
              )}
            </div>

            {/* Live "after contribution" preview */}
            {contributeAmount > 0 && !isNaN(Number(contributeAmount)) && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  After this contribution:{' '}
                  <span className="font-bold">
                    {formatINR(Math.min(contributeGoal.targetAmount, contributeGoal.currentAmount + Number(contributeAmount)))}
                  </span>
                  {' '}/ {formatINR(contributeGoal.targetAmount)}
                  {contributeGoal.currentAmount + Number(contributeAmount) >= contributeGoal.targetAmount && (
                    <span className="ml-1">🎉 Goal complete!</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setContributeGoal(null); resetContribute(); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-sm flex items-center gap-2"
                disabled={contributeLoading}
              >
                {contributeLoading ? 'Adding…' : `Add ${contributeAmount > 0 && !isNaN(Number(contributeAmount)) ? formatINR(Number(contributeAmount)) : 'Money'}`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        title="Delete Goal"
        description="Are you sure you want to delete this savings goal?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
