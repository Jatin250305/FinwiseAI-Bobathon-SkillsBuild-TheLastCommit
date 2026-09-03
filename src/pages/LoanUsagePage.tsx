// ── Loan Usage Page ───────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loanService } from '@/services/loanService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { LoadingState, ErrorState } from '@/components/ui/index';
import { formatINR } from '@/utils/helpers';
import type { LoanUsage } from '@/types/loan';

const PALETTE = ['#0F172A','#475569','#485556','#64748B','#9CA3AF','#0F172A','#D4A99A','#64748B'];

export default function LoanUsagePage() {
  const [usage, setUsage] = useState<LoanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loanService.getUsage('loan1').then(setUsage).catch(() => setError('Unable to load loan usage.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading loan usage..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!usage) return null;

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header flex items-start gap-4">
        <Link to="/loan" className="mt-1 p-1.5 rounded-lg hover:bg-[#e5e7eb] transition-colors" aria-label="Back to loan">
          <ArrowLeft className="w-4 h-4 text-[#4B5563] dark:text-[#94A3B8]" />
        </Link>
        <div>
          <h2 className="page-title">Where Did My Education Loan Go?</h2>
          <p className="page-subtitle">Breakdown of {formatINR(usage.totalUsed)} used from your education loan</p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Donut chart */}
        <FinancialCard title="Spending Breakdown" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={usage.breakdown}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                dataKey="amount"
                nameKey="category"
                paddingAngle={2}
              >
                {usage.breakdown.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatINR(v)} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm font-semibold text-[#0F172A] dark:text-[#E2E8F0] mt-2">
            Total Used: {formatINR(usage.totalUsed)}
          </p>
        </FinancialCard>

        {/* Horizontal bars */}
        <FinancialCard title="Category Details" className="md:col-span-3">
          <div className="space-y-4">
            {usage.breakdown.map((item, i) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">{formatINR(item.amount)}</span>
                    <span className="text-xs text-[#9CA3AF] w-10 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden"
                  role="progressbar" aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${item.category}: ${item.percentage.toFixed(1)}% of loan used`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${item.percentage}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </FinancialCard>
      </div>

      {/* AI Explanation */}
      {usage.aiExplanation && (
        <div className="card border-[#0F172A]/20 bg-[#0F172A]/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#0F172A] dark:text-[#94A3B8]" aria-hidden />
            <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">AI Explanation</span>
            <span className="text-xs text-[#9CA3AF] ml-1">— generated from your verified loan & transaction data</span>
          </div>
          <p className="text-sm text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">{usage.aiExplanation}</p>
          <p className="text-xs text-[#9CA3AF] mt-3">
            This explanation is generated from your verified loan disbursement and transaction records. Values are not independently calculated by AI.
          </p>
        </div>
      )}
    </div>
  );
}
