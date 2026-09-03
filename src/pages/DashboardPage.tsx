// ── Dashboard Page ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  HeartPulse, Target, GraduationCap, ArrowRight, Zap, Sparkles, Plus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { ErrorState, GoalProgress, Modal } from '@/components/ui/index';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { AIInsightCard } from '@/components/analytics/AIInsightCard';
import { incomeService } from '@/services/incomeService';
import { analyticsService } from '@/services/analyticsService';
import { goalService } from '@/services/goalService';
import { walletService } from '@/services/walletService';
import type { WalletBalance } from '@/services/walletService';
import { formatINR, getGreeting, useChartColors } from '@/utils/helpers';
import type { DashboardSummary } from '@/types/income';
import type { AIInsight, MonthlyTrendPoint } from '@/types/analytics';
import type { Goal } from '@/types/goal';
import { useAuthStore } from '@/store/authStore';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] rounded-xl p-3 shadow-modal text-xs">
      <p className="font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mb-0.5">{p.name}: {formatINR(p.value)}</p>
      ))}
    </div>
  );
};

const depositSchema = z.object({
  amount: z.coerce.number()
    .positive('Amount must be positive')
    .max(100_000, 'Maximum single deposit is ₹1,00,000'),
  description: z.string().min(1, 'Description is required').max(200),
});
type DepositForm = z.infer<typeof depositSchema>;

export default function DashboardPage() {
  const c = useChartColors();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [trend, setTrend] = useState<MonthlyTrendPoint[]>([]);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: undefined, description: '' },
  });

  const loadDashboard = async () => {
    try {
      const [sum, ins, gls, tr, wal] = await Promise.all([
        incomeService.getDashboardSummary(),
        analyticsService.getInsights(),
        goalService.getAll(),
        analyticsService.getMonthlyTrend(),
        walletService.get(),
      ]);
      setSummary(sum);
      setInsights(ins.slice(0, 3));
      setGoals(gls.filter((g) => g.status === 'active').slice(0, 3));
      setTrend(tr);
      setWallet(wal);
    } catch {
      setError('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const onDeposit = async (data: DepositForm) => {
    try {
      const updated = await walletService.deposit(data.amount, data.description);
      setWallet(updated);
      toast.success(`${formatINR(data.amount)} added to your wallet`);
      setShowDeposit(false);
      reset();
    } catch {
      toast.error('Deposit could not be processed. Please try again.');
    }
  };

  const displayName = user?.name?.split(' ')[0] ?? summary?.userName?.split(' ')[0] ?? 'there';

  // P2: Dynamic subtitle — use monthly surplus when loaded; fall back gracefully
  const greetingSubtitle = summary
    ? summary.remainingBalance > 0
      ? `You're ${formatINR(summary.remainingBalance)} positive this month. Keep it up.`
      : `Monthly surplus: ${formatINR(summary.remainingBalance)}.`
    : "Here's your financial overview";

  // Derive expense trend from real monthly trend data (last two months)
  const expenseTrend: number | null = (() => {
    if (trend.length < 2) return null;
    const prev = trend[trend.length - 2].expenses;
    const cur  = trend[trend.length - 1].expenses;
    if (prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  const incomeTrend: number | null = (() => {
    if (trend.length < 2) return null;
    const prev = trend[trend.length - 2].income;
    const cur  = trend[trend.length - 1].income;
    if (prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  const insightText = expenseTrend === null
    ? "Add transactions to see your spending insights here."
    : expenseTrend < 0
    ? `You're spending ${Math.abs(expenseTrend)}% less than last month — great discipline.`
    : expenseTrend > 0
    ? `Expenses are up ${expenseTrend}% vs last month. Review your budget.`
    : `Your spending is stable compared to last month.`;

  // P1: Financial Health qualitative label
  function healthLabel(score: number) {
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Work';
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 fade-in">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="relative rounded-[20px] overflow-hidden p-6 border border-[#0F172A]/40 dark:border-white/8"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)' }}>
        {/* Decorative orbs */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }} />
        {/* Decorative graph lines */}
        <svg viewBox="0 0 400 80" fill="none" className="absolute bottom-0 right-0 w-56 opacity-[0.06]" aria-hidden>
          <polyline points="0,60 60,40 120,48 180,20 240,32 300,8 360,18 400,12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="0,72 60,55 120,62 180,38 240,50 300,28 360,35 400,28" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </svg>

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm text-white/45 mb-1">{getGreeting()}</p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {displayName} 👋
            </h2>
            <p className="text-sm text-white/50 mt-1">
              {greetingSubtitle}
            </p>
          </div>
          <Link
            to="/ai-bot"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', boxShadow: '0 4px 12px rgba(15,23,42,0.25)' }}
          >
            <Zap className="w-4 h-4" aria-hidden />
            Ask FinWise AI
          </Link>
        </div>
      </div>

      {/* ── Hero metric + stat grid ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* Top hero row — Monthly Surplus is the primary number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* P0: labelled "planned" to distinguish from Transactions "received" */}
            <StatCard
              title="Monthly Income (Planned)"
              value={formatINR(summary?.monthlyIncome ?? 0)}
              icon={<TrendingUp className="w-4 h-4" />}
              trend={incomeTrend !== null ? { value: incomeTrend, label: 'vs last month' } : undefined}
              accent
              className="sm:col-span-1"
            />
            <StatCard
              title="Total Expenses"
              value={formatINR(summary?.totalExpenses ?? 0)}
              icon={<TrendingDown className="w-4 h-4" />}
              trend={expenseTrend !== null ? { value: expenseTrend, label: 'vs last month' } : undefined}
            />
            {/* P0: renamed from "Remaining Balance" + P2: hero size for visual hierarchy */}
            <StatCard
              title="Monthly Surplus"
              value={formatINR(summary?.remainingBalance ?? 0)}
              icon={<Wallet className="w-4 h-4" />}
              subtitle="Income minus expenses this month"
              soft
              hero
            />
          </div>

          {/* Second row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* P0: subtitle clarifies this is the total balance, not monthly */}
            <StatCard
              title="Current Savings"
              value={formatINR(summary?.currentSavings ?? 0)}
              icon={<PiggyBank className="w-4 h-4" />}
              subtitle="Total balance"
              soft
            />
            <StatCard
              title="Active Loans"
              value={`${summary?.activeLoans ?? 0}`}
              icon={<GraduationCap className="w-4 h-4" />}
              subtitle="Education loan"
            />
            <StatCard
              title="Goal Progress"
              value={`${summary?.savingsGoalProgress ?? 0}%`}
              icon={<Target className="w-4 h-4" />}
              subtitle="Across all goals"
            />
            {/* P1: add qualitative label next to the score */}
            <StatCard
              title="Financial Health"
              value={`${summary?.financialHealthScore ?? 0}/100`}
              icon={<HeartPulse className="w-4 h-4" />}
              subtitle={healthLabel(summary?.financialHealthScore ?? 0)}
              soft
            />
          </div>

          {/* ── Wallet balance card ──────────────────────────────────── */}
          <div className="rounded-[16px] border border-[#E5E7EB] dark:border-white/8
            bg-white dark:bg-[#1E293B] shadow-card p-5
            flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                bg-[#F3F4F6] dark:bg-white/8">
                <Wallet className="w-5 h-5 text-[#4B5563] dark:text-[#94A3B8]" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-[#94A3B8]">
                  Wallet Balance
                </p>
                <p className="text-2xl font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-tight mt-0.5">
                  {wallet ? formatINR(wallet.balance) : '—'}
                </p>
                {wallet && (
                  <p className="text-xs text-[#9CA3AF] dark:text-[#64748B] mt-0.5">
                    Updated {new Date(wallet.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDeposit(true)}
              className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Add Money
            </button>
          </div>

          {/* P1: FinWise Insight card — derived from existing trend delta, no invented data */}
          <div className="rounded-[14px] border border-[#E5E7EB] dark:border-white/[0.08]
            bg-[#F9FAFB] dark:bg-[#1E293B]/60
            px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
              bg-[#0F172A]/8 dark:bg-white/8">
              <Sparkles className="w-4 h-4 text-[#0F172A] dark:text-[#94A3B8]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF] dark:text-[#94A3B8] mb-0.5">
                FinWise Insight ✨
              </p>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#E2E8F0] leading-snug">
                {insightText}
              </p>
            </div>
            <Link to="/analytics" className="ml-auto flex-shrink-0 text-xs text-[#9CA3AF] dark:text-[#94A3B8] hover:underline whitespace-nowrap">
              View analytics →
            </Link>
          </div>
        </>
      )}

      {/* ── Charts + Goals row ──────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Income vs Expense bar chart */}
        <FinancialCard
          title="Income vs Expenses"
          className="md:col-span-2"
          action={<Link to="/analytics" className="text-xs text-[#0F172A] dark:text-[#94A3B8] hover:underline font-medium">View all →</Link>}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: c.cursor }} />
              <Bar dataKey="income" fill={c.primary} name="Income" radius={[5,5,0,0]} />
              <Bar dataKey="expenses" fill={c.secondary} name="Expenses" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </FinancialCard>

        {/* Savings goals */}
        <FinancialCard
          title="Savings Goals"
          action={<Link to="/savings-goals" className="text-xs text-[#0F172A] dark:text-[#94A3B8] hover:underline font-medium flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>}
        >
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-8 rounded-lg shimmer" />)}
              </div>
            ) : goals.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] py-4 text-center">No active goals yet</p>
            ) : goals.map((g) => (
              <GoalProgress key={g.id} name={g.name} current={g.currentAmount}
                target={g.targetAmount} deadline={g.deadline} monthlyContribution={g.monthlyContribution} />
            ))}
          </div>
        </FinancialCard>
      </div>

      {/* ── Savings trend + AI Insights ─────────────────────────────── */}
      <div className="grid md:grid-cols-5 gap-5">
        {/* Savings trend line */}
        <FinancialCard title="Savings Trend" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="savings" stroke={c.primary} strokeWidth={2.5} dot={false} name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </FinancialCard>

        {/* AI Insights */}
        <FinancialCard
          title="AI Insights"
          className="md:col-span-3"
          action={<Link to="/analytics" className="text-xs text-[#0F172A] dark:text-[#94A3B8] hover:underline font-medium">All insights →</Link>}
        >
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}
              </div>
            ) : insights.map((ins) => (
              <AIInsightCard key={ins.id} insight={ins} compact />
            ))}
          </div>
        </FinancialCard>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-[0.12em] mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/affordability',    label: 'Can I Afford This?', icon: '🤔', desc: 'Check any purchase' },
            { to: '/loan',             label: 'Education Loan',     icon: '🎓', desc: 'View loan details' },
            { to: '/scholarships',     label: 'Scholarships',       icon: '🏆', desc: 'Find opportunities' },
            { to: '/financial-health', label: 'Financial Health',   icon: '❤️', desc: 'Your health score' },
          ].map((item) => (
            <Link key={item.to} to={item.to}
              className="flex items-center gap-3 p-4 rounded-[14px] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]
                bg-white dark:bg-[#0F172A] hover:border-[#0F172A]/50 dark:hover:border-[#0F172A]/40
                hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] group-hover:text-[#0F172A] transition-colors truncate">
                  {item.label}
                </p>
                <p className="text-[10px] text-[#9CA3AF] dark:text-[#94A3B8] truncate">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Add Money (Wallet Deposit) Modal ────────────────────────── */}
      <Modal open={showDeposit} onClose={() => { setShowDeposit(false); reset(); }} title="Add Money to Wallet" size="sm">
        <form onSubmit={handleSubmit(onDeposit)} className="space-y-4">
          <div>
            <label className="label">Amount (₹)</label>
            <input
              type="number"
              step="1"
              min="1"
              max="100000"
              {...register('amount')}
              className="input"
              placeholder="e.g. 5000"
              autoFocus
            />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
            <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-1">
              Maximum single deposit: ₹1,00,000
            </p>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              {...register('description')}
              className="input"
              placeholder="e.g. Monthly allowance, Freelance payment"
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowDeposit(false); reset(); }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-sm"
            >
              {isSubmitting ? 'Processing…' : 'Add Money'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
