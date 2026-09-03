// ── Education Loan Page ───────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Plus, ClipboardList } from 'lucide-react';
import { loanService } from '@/services/loanService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { LoadingState, ErrorState, Alert } from '@/components/ui/index';
import { formatINR, formatDate } from '@/utils/helpers';
import type { Loan } from '@/types/loan';

function LoanDetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-0">
      <span className="text-sm text-[#4B5563] dark:text-[#94A3B8]">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#0F172A] dark:text-[#F1F5F9]' : 'text-[#0F172A] dark:text-[#F1F5F9]'}`}>{value}</span>
    </div>
  );
}

export default function LoanPage() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loanService.getAll().then((loans) => {
      setLoan(loans[0] ?? null);
    }).catch(() => setError('Unable to load loan details.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading loan details..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!loan) return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="page-title">Education Loan</h2>
        <p className="page-subtitle">Manage your education financing</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/loans/apply"
          className="card flex items-center gap-4 hover:border-[#0F172A]/20 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] dark:text-white">Apply for Education Loan</p>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Submit a new education loan application</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#9CA3AF] ml-auto group-hover:text-[#0F172A] transition-colors" />
        </Link>
        <Link to="/loans/my-applications"
          className="card flex items-center gap-4 hover:border-[#0F172A]/20 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1E293B] flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-[#6B7280]" />
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] dark:text-white">My Applications</p>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Track your loan applications</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#9CA3AF] ml-auto group-hover:text-[#0F172A] transition-colors" />
        </Link>
      </div>
      <p className="text-sm text-[#9CA3AF]">No active EMI-based loans found. You can also add a loan record via the loan management section.</p>
    </div>
  );

  const usedPercent = Math.round((loan.amountUsed / loan.principalAmount) * 100);

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <h2 className="page-title">Education Loan</h2>
        <p className="page-subtitle">{loan.name}</p>
      </div>

      <Alert variant="info">
        All financial values shown here — including EMI, interest, and total repayment — are calculated by the FinWise backend financial service. The frontend only displays verified values.
      </Alert>

      {/* Loan overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Loan Amount', value: formatINR(loan.principalAmount) },
          { label: 'Amount Used', value: formatINR(loan.amountUsed), highlight: true },
          { label: 'Remaining', value: formatINR(loan.remainingLoan) },
          { label: 'Monthly EMI', value: formatINR(loan.emi), highlight: true },
          { label: 'Interest Rate', value: `${loan.interestRate}% p.a.` },
          { label: 'Tenure', value: `${loan.tenureMonths / 12} years` },
        ].map((item) => (
          <div key={item.label} className={`card ${item.highlight ? 'border-l-4 border-l-[#0F172A]' : ''}`}>
            <p className="text-xs text-[#9CA3AF] mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.highlight ? 'text-[#0F172A] dark:text-[#F1F5F9]' : 'text-[#0F172A] dark:text-[#F1F5F9]'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Usage bar */}
      <FinancialCard title="Loan Utilization">
        <div className="space-y-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#9CA3AF]">Used: {formatINR(loan.amountUsed)}</span>
            <span className="text-[#9CA3AF]">Total: {formatINR(loan.principalAmount)}</span>
          </div>
          <div className="h-4 bg-[#F3F4F6] rounded-full overflow-hidden"
            role="progressbar" aria-valuenow={usedPercent} aria-valuemin={0} aria-valuemax={100}
            aria-label={`Loan utilization: ${usedPercent}% used`}>
            <div className="h-full bg-[#0F172A] rounded-full transition-all flex items-center justify-end pr-2"
              style={{ width: `${usedPercent}%` }}>
              <span className="text-[10px] text-white font-bold">{usedPercent}%</span>
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {formatINR(loan.remainingLoan)} ({100 - usedPercent}%) available to disburse
          </p>
        </div>
      </FinancialCard>

      {/* Repayment details */}
      <FinancialCard title="Repayment Details">
        <div>
          <LoanDetailRow label="Total Repayment" value={formatINR(loan.totalRepayment)} highlight />
          <LoanDetailRow label="Total Interest" value={formatINR(loan.totalInterest)} />
          <LoanDetailRow label="Monthly EMI" value={formatINR(loan.emi)} highlight />
          <LoanDetailRow label="Loan Start Date" value={formatDate(loan.loanStartDate)} />
          <LoanDetailRow label="Repayment Starts" value={formatDate(loan.repaymentStartDate)} />
          <LoanDetailRow label="Status" value={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)} />
        </div>
        <div className="mt-4 p-3 bg-[#E2E8F0]/10 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#0F172A] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-[#4B5563] dark:text-[#94A3B8]">
              <strong>Note:</strong> EMI of {formatINR(loan.emi)} begins on {formatDate(loan.repaymentStartDate)}. Total interest payable is {formatINR(loan.totalInterest)}. All calculations are provided by the FinWise financial backend.
            </p>
          </div>
        </div>
      </FinancialCard>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/loan/usage" className="card flex items-center gap-3 hover:border-[#0F172A]/20 transition-all group">
          <ArrowRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0F172A]" />
          <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">View Loan Usage</span>
        </Link>
        <Link to="/loans/apply" className="card flex items-center gap-3 hover:border-[#0F172A]/20 transition-all group">
          <Plus className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0F172A]" />
          <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Apply for New Loan</span>
        </Link>
        <Link to="/loans/my-applications" className="card flex items-center gap-3 hover:border-[#0F172A]/20 transition-all group">
          <ClipboardList className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0F172A]" />
          <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">My Applications</span>
        </Link>
      </div>
    </div>
  );
}
