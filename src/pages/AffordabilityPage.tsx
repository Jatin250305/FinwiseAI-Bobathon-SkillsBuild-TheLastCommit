// ── Affordability Checker Page ────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, AlertTriangle, XCircle, Sparkles, Clock } from 'lucide-react';
import { affordabilityService } from '@/services/affordabilityService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { LoadingState, Alert } from '@/components/ui/index';
import { formatINR, formatDate } from '@/utils/helpers';
import type { AffordabilityResult, AffordabilityRecord } from '@/types/affordability';

const affordSchema = z.object({
  itemName: z.string().min(2, 'Item name is required'),
  itemPrice: z.coerce.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  isRecurring: z.boolean(),
});
type AffordForm = z.infer<typeof affordSchema>;

const CATEGORIES = ['shopping','education','healthcare','food','transportation','entertainment','other'];

const RESULT_CONFIG = {
  comfortable: { icon: CheckCircle, label: 'Comfortable', color: 'text-green-600', bg: 'bg-green-50 border-green-300', barColor: 'bg-green-500' },
  proceed_with_caution: { icon: AlertTriangle, label: 'Proceed with Caution', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-300', barColor: 'bg-amber-500' },
  not_recommended: { icon: XCircle, label: 'Not Recommended', color: 'text-red-600', bg: 'bg-red-50 border-red-300', barColor: 'bg-red-500' },
};

function AffordabilityResultCard({ result }: { result: AffordabilityResult }) {
  const config = RESULT_CONFIG[result.recommendation];
  const Icon = config.icon;
  const disposableUsedPct = Math.min(100, Math.round((result.itemPrice / result.estimatedDisposableAmount) * 100));

  return (
    <div className="space-y-5 fade-in">
      {/* Verdict banner */}
      <div className={`rounded-xl border-2 p-5 flex items-center gap-4 ${config.bg}`}>
        <Icon className={`w-8 h-8 ${config.color} flex-shrink-0`} aria-hidden />
        <div>
          <p className={`text-lg font-bold ${config.color}`}>{config.label}</p>
          <p className="text-sm text-[#4B5563] dark:text-[#94A3B8]">{formatINR(result.itemPrice)} — based on your current financial profile</p>
        </div>
      </div>

      {/* Financial breakdown */}
      <FinancialCard title="Financial Breakdown">
        {[
          { label: 'Item Price', value: formatINR(result.itemPrice), accent: true },
          { label: 'Available Balance', value: formatINR(result.availableBalance) },
          { label: 'Expected Monthly Expenses', value: formatINR(result.expectedMonthlyExpenses) },
          { label: 'Upcoming Obligations (EMI etc.)', value: formatINR(result.upcomingObligations) },
          { label: 'Savings Goal Contribution', value: formatINR(result.savingsGoalContribution) },
          { label: 'Estimated Disposable Amount', value: formatINR(result.estimatedDisposableAmount), accent: true },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[#E5E7EB] last:border-0">
            <span className="text-sm text-[#4B5563] dark:text-[#94A3B8]">{row.label}</span>
            <span className={`text-sm font-semibold ${row.accent ? 'text-[#0F172A] dark:text-[#F1F5F9]' : 'text-[#0F172A] dark:text-[#F1F5F9]'}`}>{row.value}</span>
          </div>
        ))}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-[#9CA3AF]">
            <span>Purchase as % of disposable income</span>
            <span>{disposableUsedPct}%</span>
          </div>
          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${config.barColor}`} style={{ width: `${Math.min(100, disposableUsedPct)}%` }} />
          </div>
        </div>
      </FinancialCard>

      {/* AI Explanation */}
      <div className="card border-[#0F172A]/20 bg-[#0F172A]/5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#0F172A] dark:text-[#94A3B8]" aria-hidden />
          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">AI Explanation</span>
        </div>
        <p className="text-sm text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">{result.aiExplanation}</p>
        <p className="text-xs text-[#9CA3AF] mt-2">
          This recommendation is based on verified financial data from your FinWise account. The AI explains the backend result — it does not independently calculate your affordability.
        </p>
      </div>
    </div>
  );
}

export default function AffordabilityPage() {
  const [result, setResult] = useState<AffordabilityResult | null>(null);
  const [history, setHistory] = useState<AffordabilityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<AffordabilityRecord | null>(null);

  useEffect(() => {
    affordabilityService.getHistory().then(setHistory).finally(() => setHistoryLoading(false));
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<AffordForm>({
    resolver: zodResolver(affordSchema),
    defaultValues: { category: 'shopping', isRecurring: false },
  });

  const onSubmit = async (data: AffordForm) => {
    setLoading(true);
    setResult(null);
    setSelectedHistory(null);
    try {
      const res = await affordabilityService.check(data);
      setResult(res);
      const newHistory = await affordabilityService.getHistory();
      setHistory(newHistory);
    } catch {
      // error handled by service
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <h2 className="page-title">Can I Afford This?</h2>
        <p className="page-subtitle">Get an AI-powered affordability analysis based on your verified financial data</p>
      </div>

      <Alert variant="info">
        Affordability analysis is performed by the FinWise backend financial engine using your verified income, expenses, loans, and savings goals. The AI explains the result — it does not calculate it independently.
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input form */}
        <FinancialCard title="Check Affordability">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Item Name</label>
              <input type="text" {...register('itemName')} className="input" placeholder="e.g. Sony Headphones" />
              {errors.itemName && <p className="text-xs text-red-600 mt-1">{errors.itemName.message}</p>}
            </div>
            <div>
              <label className="label">Item Price (₹)</label>
              <input type="number" step="100" {...register('itemPrice')} className="input" placeholder="0" />
              {errors.itemPrice && <p className="text-xs text-red-600 mt-1">{errors.itemPrice.message}</p>}
            </div>
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="recurring" {...register('isRecurring')} className="w-4 h-4 accent-[#0F172A]" />
              <label htmlFor="recurring" className="text-sm text-[#4B5563] dark:text-[#94A3B8]">This is a recurring purchase</label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</> : 'Check Affordability'}
            </button>
          </form>
        </FinancialCard>

        {/* Result */}
        <div>
          {loading ? (
            <LoadingState message="Analyzing your financial data..." />
          ) : selectedHistory ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-[#4B5563] dark:text-[#94A3B8]">Viewing: {selectedHistory.itemName}</p>
                <button onClick={() => setSelectedHistory(null)} className="text-xs text-[#0F172A] dark:text-[#94A3B8] hover:underline">Clear</button>
              </div>
              <AffordabilityResultCard result={selectedHistory.result} />
            </div>
          ) : result ? (
            <AffordabilityResultCard result={result} />
          ) : (
            <div className="h-full flex items-center justify-center text-center py-16">
              <div>
                <p className="text-4xl mb-4">🤔</p>
                <p className="text-[#0F172A] dark:text-[#F1F5F9] font-semibold">Enter an item to check affordability</p>
                <p className="text-sm text-[#9CA3AF] mt-1">Your analysis will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <FinancialCard title="Affordability History" action={<Clock className="w-4 h-4 text-[#9CA3AF]" />}>
        {historyLoading ? (
          <LoadingState message="Loading history..." />
        ) : history.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] py-4">No checks yet. Try checking something above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5E7EB]">
                <tr>
                  {['Item', 'Price', 'Date', 'Result', ''].map((h) => (
                    <th key={h} className="text-left pb-3 text-xs font-semibold text-[#4B5563] dark:text-[#94A3B8] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/8">
                {history.map((rec) => {
                  const conf = RESULT_CONFIG[rec.recommendation];
                  const Icon = conf.icon;
                  return (
                    <tr key={rec.id} className="hover:bg-[#f7f8fa] dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 font-medium text-[#0F172A] dark:text-[#F1F5F9]">{rec.itemName}</td>
                      <td className="py-3 text-[#4B5563] dark:text-[#94A3B8]">{formatINR(rec.itemPrice)}</td>
                      <td className="py-3 text-[#9CA3AF]">{formatDate(rec.date)}</td>
                      <td className="py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${conf.color}`}>
                          <Icon className="w-3.5 h-3.5" aria-hidden />{conf.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => setSelectedHistory(rec)} className="text-xs text-[#0F172A] dark:text-[#94A3B8] hover:underline">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FinancialCard>
    </div>
  );
}
