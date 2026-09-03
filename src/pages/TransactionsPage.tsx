// ── Transactions Page ─────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, Trash2, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight as TransferIcon, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { transactionService } from '@/services/transactionService';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { Modal, EmptyState, LoadingState, ErrorState, ConfirmationDialog } from '@/components/ui/index';
import { formatINR, formatDate } from '@/utils/helpers';
import type { Transaction, TransactionCategory, TransactionType, PaymentMethod } from '@/types/transaction';

const CATEGORIES: TransactionCategory[] = [
  'education','food','shopping','healthcare','transportation','accommodation','entertainment','utilities','personal','other'
];
const TYPES: TransactionType[] = ['income','expense','loan','scholarship','savings'];
const PAYMENT_METHODS: PaymentMethod[] = ['upi','cash','card','bank_transfer','other'];

const txSchema = z.object({
  description: z.string().min(2, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['education','food','shopping','healthcare','transportation','accommodation','entertainment','utilities','personal','other']),
  type: z.enum(['income','expense','loan','scholarship','savings']),
  paymentMethod: z.enum(['upi','cash','card','bank_transfer','other']),
  source: z.string().optional(),
  notes: z.string().optional(),
});
type TxForm = z.infer<typeof txSchema>;

type FilterTab = 'all' | 'loan' | 'education_loan';

const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  education: '📚', food: '🍽️', shopping: '🛍️', healthcare: '💊',
  transportation: '🚌', accommodation: '🏠', entertainment: '🎬',
  utilities: '⚡', personal: '👤', other: '📦',
};

function getTypeSign(type: TransactionType) {
  if (type === 'income' || type === 'scholarship') return '+';
  if (type === 'savings') return '→';
  return '−';
}

function getTypeColor(type: TransactionType) {
  if (type === 'income' || type === 'scholarship') return 'text-green-600 dark:text-green-400';
  if (type === 'savings') return 'text-sky-600 dark:text-sky-400';
  return 'text-red-600 dark:text-red-400';
}

function TransactionRow({ tx, onDelete }: { tx: Transaction; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-white/5
      border-b border-[#F1F5F9] dark:border-white/5 last:border-0
      transition-colors duration-150 group">
      {/* Category icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base
        bg-[#F9FAFB] dark:bg-white/8 border border-[#E5E7EB] dark:border-white/8">
        {CATEGORY_ICONS[tx.category] ?? '📦'}
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0F172A] dark:text-[#E2E8F0] truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <CategoryBadge category={tx.category} />
          <span className="text-[10px] text-[#9CA3AF] dark:text-[#94A3B8]">{tx.paymentMethod.replace('_', ' ').toUpperCase()}</span>
        </div>
      </div>

      {/* Date */}
      <span className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] whitespace-nowrap hidden sm:block flex-shrink-0">
        {formatDate(tx.date)}
      </span>

      {/* Type badge */}
      <div className="hidden md:block flex-shrink-0">
        <CategoryBadge type={tx.type} />
      </div>

      {/* Amount */}
      <span className={`text-sm font-semibold whitespace-nowrap flex-shrink-0 ${getTypeColor(tx.type)}`}>
        {getTypeSign(tx.type)}{formatINR(tx.amount)}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20
          text-[#C8B0A8] hover:text-red-500 transition-all duration-200 flex-shrink-0"
        aria-label={`Delete ${tx.description}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Date-group label helper ──────────────────────────────────────────────────
function getDateGroupLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  // Within this calendar week (Mon–Sun)
  const txDate = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = today.getDay(); // 0 = Sun
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  if (txDate >= startOfWeek) return 'This Week';

  // Within this calendar month
  if (
    txDate.getMonth() === today.getMonth() &&
    txDate.getFullYear() === today.getFullYear()
  ) {
    return 'This Month';
  }

  // Older — show "Month Year"
  return txDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Group sorted (desc) transactions into ordered sections
function groupByDate(txs: Transaction[]): Array<{ label: string; items: Transaction[] }> {
  const groups: Map<string, Transaction[]> = new Map();
  for (const tx of txs) {
    const label = getDateGroupLabel(tx.date);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: import('@/types/transaction').TransactionFilters = {
        search: search || undefined,
        category: (categoryFilter as import('@/types/transaction').TransactionCategory) || undefined,
        type: (typeFilter as import('@/types/transaction').TransactionType) || undefined,
      };
      if (filterTab === 'loan') filters.type = 'loan';
      if (filterTab === 'education_loan') { filters.loanId = 'loan1'; filters.type = undefined; }
      let data = await transactionService.getAll(filters);
      // Payment method filter is client-side (not yet in TransactionFilters API)
      if (paymentFilter) data = data.filter(t => t.paymentMethod === paymentFilter);
      setTransactions(data);
      setPage(1);
    } catch {
      setError('Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, typeFilter, filterTab, paymentFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], type: 'expense', category: 'food', paymentMethod: 'upi' },
  });

  const onAddSubmit = async (data: TxForm) => {
    try {
      await transactionService.create(data);
      toast.success('Transaction added');
      setShowAdd(false);
      reset();
      fetchTransactions();
    } catch {
      toast.error('Failed to add transaction');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await transactionService.delete(deleteId);
      toast.success('Transaction deleted');
      setDeleteId(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  const paginated = transactions.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(transactions.length / PER_PAGE);
  const dateGroups = groupByDate(paginated);

  // Summary stats — scoped to all filtered transactions (not just current page)
  const income = transactions.filter(t => t.type === 'income' || t.type === 'scholarship').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const hasActiveFilters = !!(categoryFilter || typeFilter || paymentFilter);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between page-header">
        <div>
          <h2 className="page-title">Transactions</h2>
          <p className="page-subtitle">{transactions.length} transactions found</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" aria-hidden /> Add Transaction
        </button>
      </div>

      {/* Summary cards */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {/* Received this month — from logged transactions only (differs from planned monthly income) */}
          <div className="card py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Received this month</p>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatINR(income)}</p>
          </div>

          {/* Total Expenses */}
          <div className="card py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Total Expenses</p>
            </div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatINR(expenses)}</p>
          </div>

          {/* Net Flow — with tooltip */}
          <div className="card py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#F9FAFB] dark:bg-white/5 ${income >= expenses ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <TransferIcon className="w-4 h-4" />
              </span>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#94A3B8] uppercase tracking-wide font-semibold">Net Flow</p>
              <span
                className="relative group ml-auto flex-shrink-0"
                aria-label="Income minus expenses for the selected period"
              >
                <Info className="w-3 h-3 text-[#9CA3AF] dark:text-[#94A3B8] cursor-help" aria-hidden />
                {/* Tooltip */}
                <span className="pointer-events-none absolute right-0 top-5 z-20 w-44 rounded-lg
                  bg-[#0F172A] dark:bg-[#1E293B] text-white text-[10px] leading-snug px-2.5 py-2
                  shadow-modal border border-white/10
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  role="tooltip">
                  Income minus expenses for the selected period.
                </span>
              </span>
            </div>
            <p className={`text-lg font-bold ${income >= expenses ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatINR(income - expenses)}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'loan', 'education_loan'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              filterTab === tab
                ? 'text-white shadow-sm'
                : 'bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] text-[#4B5563] dark:text-[#94A3B8] hover:border-[#0F172A]/50'
            }`}
            style={filterTab === tab
              ? { background: 'linear-gradient(135deg, #0F172A, #1E293B)' }
              : {}}
          >
            {tab === 'all' ? 'All Transactions' : tab === 'loan' ? 'Loan Transactions' : 'Education Loan Usage'}
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
          <input
            type="search"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Search transactions"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-[#94A3B8]" aria-label="Clear search">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-auto min-w-[140px]"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-auto min-w-[120px]"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        {/* Payment method filter — added as P1 gap */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="input w-auto min-w-[130px]"
          aria-label="Filter by payment method"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m.replace('_', ' ').charAt(0).toUpperCase() + m.replace('_', ' ').slice(1)}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button onClick={() => { setCategoryFilter(''); setTypeFilter(''); setPaymentFilter(''); }} className="btn-ghost text-sm flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Transaction list — date-grouped */}
      {loading ? (
        <LoadingState message="Loading transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTransactions} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<TransferIcon className="w-7 h-7" />}
          title="Your financial story starts here"
          description="No transactions found. Add your first transaction to start tracking your finances."
          action={<button onClick={() => setShowAdd(true)} className="btn-primary text-sm">Add Transaction</button>}
        />
      ) : (
        <div className="space-y-1">
          {dateGroups.map(({ label, items }) => (
            <div key={label}>
              {/* Date section header */}
              <div className="flex items-center gap-3 px-1 py-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF] dark:text-[#64748B]">
                  {label}
                </span>
                <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/[0.06]" />
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#64748B]">
                  {formatINR(items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              {/* Transactions in this group */}
              <div className="bg-white dark:bg-[#1E293B] rounded-[14px] border border-[#E5E7EB] dark:border-white/[0.08] shadow-card overflow-hidden">
                {items.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onDelete={() => setDeleteId(tx.id)} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-2 flex items-center justify-between text-sm text-[#9CA3AF]">
              <span className="text-xs">Page {page} of {totalPages} · {transactions.length} transactions</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40 py-1 px-3">Previous</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40 py-1 px-3">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset(); }} title="Add Transaction" size="md">
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" step="0.01" {...register('amount')} className="input" placeholder="0" />
              {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" {...register('date')} className="input" />
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" {...register('description')} className="input" placeholder="What was this for?" />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select {...register('type')} className="input">
                {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Method</label>
              <select {...register('paymentMethod')} className="input">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Source (optional)</label>
              <input type="text" {...register('source')} className="input" placeholder="e.g. Freelance" />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea {...register('notes')} className="input" rows={2} placeholder="Any additional notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); reset(); }} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">Add Transaction</button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
