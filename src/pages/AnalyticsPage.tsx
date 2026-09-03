// ── Analytics Page ────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { analyticsService } from '@/services/analyticsService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { LoadingState, ErrorState } from '@/components/ui/index';
import { AIInsightCard } from '@/components/analytics/AIInsightCard';
import { formatINR, useChartColors } from '@/utils/helpers';
import type { AnalyticsSummary, CategoryBreakdown, MonthlyTrendPoint, AIInsight } from '@/types/analytics';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] rounded-xl p-3 shadow-modal text-xs">
      <p className="font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mb-0.5 dark:opacity-90">{p.name}: {formatINR(p.value)}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const c = useChartColors();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [trend, setTrend] = useState<MonthlyTrendPoint[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sum, cats, tr, ins] = await Promise.all([
          analyticsService.getSummary(),
          analyticsService.getCategoryBreakdown(),
          analyticsService.getMonthlyTrend(),
          analyticsService.getInsights(),
        ]);
        setSummary(sum);
        setCategories(cats);
        setTrend(tr);
        setInsights(ins);
      } catch {
        setError('Unable to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState message="Loading analytics..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  // New user / no data — show empty state instead of crashing on null assertions
  const hasData = summary !== null && (summary.currentMonthIncome > 0 || summary.currentMonthExpenses > 0 || trend.some(t => t.income > 0 || t.expenses > 0));

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <h2 className="page-title">Analytics</h2>
        <p className="page-subtitle">Your spending patterns and financial trends</p>
      </div>

      {!hasData && (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-1">No data yet</p>
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] max-w-xs">
            Start adding income sources and transactions — your analytics will appear here automatically.
          </p>
        </div>
      )}

      {/* Monthly Summary */}
      {hasData && summary && (
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Income — higher is better → green when positive */}
        <div className="card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-[#94A3B8] mb-1">Monthly Income</p>
          <p className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(summary.currentMonthIncome)}</p>
          <p className={`text-xs mt-1.5 font-semibold ${summary.incomeChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {summary.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(summary.incomeChange).toFixed(1)}% vs last month
          </p>
        </div>
        {/* Expenses — lower is better → green when negative (expensesChange < 0 = went down = good) */}
        <div className="card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-[#94A3B8] mb-1">Monthly Expenses</p>
          <p className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(summary.currentMonthExpenses)}</p>
          <p className={`text-xs mt-1.5 font-semibold ${summary.expensesChange <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {summary.expensesChange >= 0 ? '↑' : '↓'} {Math.abs(summary.expensesChange).toFixed(1)}% vs last month
          </p>
        </div>
      </div>

      )}

      {/* Charts row */}
      {hasData && <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <FinancialCard title="Monthly Trend">
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mb-4">Income, expenses & savings over 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, marginTop: 8 }} />
              <Line type="monotone" dataKey="income" stroke={c.primary} strokeWidth={2.5} dot={{ r: 3, fill: c.primary }} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke={c.secondary} strokeWidth={2.5} dot={{ r: 3, fill: c.secondary }} name="Expenses" />
              <Line type="monotone" dataKey="savings" stroke={c.tertiary} strokeWidth={2} dot={{ r: 2.5, fill: c.tertiary }} name="Savings" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </FinancialCard>

        {/* Income vs Expenses Bar */}
        <FinancialCard title="Income vs Expenses">
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mb-4">Monthly comparison</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: c.cursor }} />
              <Legend wrapperStyle={{ fontSize: 11, marginTop: 8 }} />
              <Bar dataKey="income" fill={c.primary} name="Income" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" fill={c.secondary} name="Expenses" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </FinancialCard>
      </div>}

      {/* Category Breakdown + Pie */}
      {hasData && categories.length > 0 && <div className="grid md:grid-cols-5 gap-6">
        {/* Pie chart */}
        <FinancialCard title="Category Breakdown" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={88}
                dataKey="amount"
                nameKey="category"
                paddingAngle={3}
                strokeWidth={0}
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={c.pie[i % c.pie.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatINR(v)} />
            </PieChart>
          </ResponsiveContainer>
        </FinancialCard>

        {/* Ranked list */}
        <FinancialCard title="Top Spending Categories" className="md:col-span-3">
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mb-4">Ranked by spend this month</p>
          <div className="space-y-3.5">
            {[...categories].sort((a, b) => b.amount - a.amount).map((cat, i) => {
              const prev = cat.previousAmount ?? cat.amount;
              const change = prev > 0 ? ((cat.amount - prev) / prev) * 100 : 0;
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#0F172A] dark:text-[#E2E8F0] capitalize">{cat.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(cat.amount)}</span>
                        {change !== 0 && (
                          <span className={`text-xs font-semibold ${change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {change > 0 ? '↑' : '↓'}{Math.abs(change).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#F3F4F6] dark:bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full progress-fill"
                        style={{ width: `${cat.percentage}%`, backgroundColor: c.catBars[i % c.catBars.length] }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] w-8 text-right">{cat.percentage}%</span>
                </div>
              );
            })}
          </div>
        </FinancialCard>
      </div>}

      {/* AI Insights */}
      {insights.length > 0 && <FinancialCard title="AI/ML Insights">
        <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mb-4 leading-relaxed">
          These insights are generated from your transaction patterns and are labelled clearly. They are not financial advice.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {insights.map((ins) => (
            <AIInsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      </FinancialCard>}
    </div>
  );
}
