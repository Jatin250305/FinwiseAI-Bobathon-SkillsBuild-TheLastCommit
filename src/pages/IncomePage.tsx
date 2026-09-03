// ── Income & Expense Tracker Page ─────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { incomeService } from '@/services/incomeService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { Modal, LoadingState, ErrorState } from '@/components/ui/index';
import { formatINR, capitalize, getCurrentMonth, getCurrentMonthLabel } from '@/utils/helpers';
import type { IncomeSummary, IncomeSource } from '@/types/income';

const SOURCE_TYPE_LABEL: Record<string, string> = {
  salary: 'Salary', stipend: 'Stipend', allowance: 'Allowance',
  freelance: 'Freelance', part_time: 'Part-time', scholarship: 'Scholarship', other: 'Other',
};

const SOURCE_TYPES = ['salary', 'stipend', 'allowance', 'freelance', 'part_time', 'scholarship', 'other'] as const;

const sourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  label: z.string().min(1, 'Label is required').max(200),
  amount: z.coerce.number().positive('Amount must be positive'),
});
type SourceForm = z.infer<typeof sourceSchema>;

export default function IncomePage() {
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editSource, setEditSource] = useState<IncomeSource | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const month = getCurrentMonth();

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await incomeService.getSummary(month);
      setSummary(data);
    } catch {
      setError('Unable to load income data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { type: 'salary', label: '', amount: 0 },
  });

  const openEdit = (src: IncomeSource) => {
    setEditSource(src);
    setValue('type', src.type);
    setValue('label', src.label);
    setValue('amount', src.amount);
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditSource(null);
    reset({ type: 'salary', label: '', amount: 0 });
  };

  const onSubmit = async (data: SourceForm) => {
    try {
      if (editSource) {
        await incomeService.updateSource(editSource.id, data);
        toast.success('Income source updated');
      } else {
        await incomeService.createSource({ ...data, month });
        toast.success('Income source added');
      }
      closeModal();
      fetchSummary();
    } catch {
      toast.error(editSource ? 'Failed to update source' : 'Failed to add source');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await incomeService.deleteSource(id);
      toast.success('Income source removed');
      fetchSummary();
    } catch {
      toast.error('Failed to delete income source');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingState message="Loading income data..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSummary} />;
  if (!summary) return null;

  const flowItems = [
    { label: 'Monthly Income', value: summary.monthlyIncome, sign: '+', color: 'text-green-600', arrow: false },
    { label: 'Essential Expenses', value: summary.essentialExpenses, sign: '−', color: 'text-red-600', arrow: true },
    { label: 'Discretionary Expenses', value: summary.discretionaryExpenses, sign: '−', color: 'text-red-600', arrow: true },
    { label: 'Savings', value: summary.savings, sign: '→', color: 'text-blue-600', arrow: true },
  ];

  const safeIncome = summary.monthlyIncome || 1;
  const savingsRate = Math.round((summary.savings / safeIncome) * 100);
  const essentialRate = Math.round((summary.essentialExpenses / safeIncome) * 100);
  const discretionaryRate = Math.round((summary.discretionaryExpenses / safeIncome) * 100);
  const remainingRate = Math.round((summary.remaining / safeIncome) * 100);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between page-header">
        <div>
          <h2 className="page-title">Income & Expenses</h2>
          <p className="page-subtitle">{getCurrentMonthLabel()} — How your money flows</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Flow visualization */}
        <FinancialCard title="Monthly Cash Flow">
          <div className="space-y-2">
            {flowItems.map((item) => (
              <div key={item.label}>
                {item.arrow && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4 bg-[#e5e7eb]" />
                  </div>
                )}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f8fa] dark:bg-white/5 border border-[#e5e7eb] dark:border-white/8">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${item.color}`}>{item.sign}</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">{item.label}</span>
                  </div>
                  <span className={`text-base font-bold ${item.color}`}>{formatINR(item.value)}</span>
                </div>
              </div>
            ))}

            {/* Divider + Remaining */}
            <div className="flex justify-center py-1">
              <div className="w-0.5 h-4 bg-[#e5e7eb]" />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0F172A] dark:bg-[#253347] dark:border dark:border-white/10 text-white">
              <span className="text-sm font-semibold">= Remaining</span>
              <span className="text-lg font-bold text-[#E2E8F0]">{formatINR(summary.remaining)}</span>
            </div>
          </div>
        </FinancialCard>

        {/* Distribution + Income Sources */}
        <div className="space-y-4">
          <FinancialCard title="Income Distribution">
            <div className="space-y-3">
              {[
                { label: 'Essential Expenses', pct: essentialRate, light: '#0F172A', dark: '#E2E8F0' },
                { label: 'Discretionary',      pct: discretionaryRate, light: '#475569', dark: '#94A3B8' },
                { label: 'Savings',            pct: savingsRate, light: '#4B5563', dark: '#64748B' },
                { label: 'Remaining Buffer',   pct: remainingRate, light: '#94A3B8', dark: '#334155' },
              ].map((item) => {
                const prefersDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#4B5563] dark:text-[#94A3B8] font-medium">{item.label}</span>
                      <span className="text-[#9CA3AF]">{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-[#F3F4F6] dark:bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full progress-fill"
                        style={{ width: `${item.pct}%`, backgroundColor: prefersDark ? item.dark : item.light }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </FinancialCard>

          {/* Income Sources with edit/delete */}
          <FinancialCard title="Income Sources">
            {summary.incomeSources.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] py-3 text-center">
                No income sources for this month. Add one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.incomeSources.map((src) => (
                  <div key={src.id} className="flex items-center justify-between py-2 border-b border-[#E5E7EB] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">{src.label}</p>
                      <p className="text-xs text-[#9CA3AF]">{SOURCE_TYPE_LABEL[src.type] ?? capitalize(src.type)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-green-600">+{formatINR(src.amount)}</span>
                      <button
                        onClick={() => openEdit(src)}
                        className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#0F172A] dark:hover:text-[#E2E8F0] transition-colors"
                        aria-label="Edit source"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(src.id)}
                        disabled={deletingId === src.id}
                        className="p-1 rounded-lg text-[#9CA3AF] hover:text-red-500 transition-colors disabled:opacity-40"
                        aria-label="Delete source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FinancialCard>
        </div>
      </div>

      {/* Add / Edit Income Source Modal */}
      <Modal
        open={showAdd || editSource !== null}
        onClose={closeModal}
        title={editSource ? 'Edit Income Source' : 'Add Income Source'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select {...register('type')} className="input">
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{SOURCE_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Label</label>
            <input type="text" {...register('label')} className="input" placeholder="e.g. Company Salary" />
            {errors.label && <p className="text-xs text-red-600 mt-1">{errors.label.message}</p>}
          </div>
          <div>
            <label className="label">Amount (₹)</label>
            <input type="number" step="100" {...register('amount')} className="input" placeholder="e.g. 25000" />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary text-sm">
              {isSubmitting ? 'Saving…' : editSource ? 'Update' : 'Add Source'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
