// ── Bank Officer Dashboard ────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loanApplicationService } from '@/services/loanApplicationService';
import type { LoanApplication, BankAnalytics } from '@/types/loanApplication';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/loanApplication';
import { formatINR } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, AlertCircle, FileText,
  RefreshCw, Users, Timer, ExternalLink, Clock,
} from 'lucide-react';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Docs Required', value: 'documents_required' },
  { label: 'Approved', value: 'approved' },
  { label: 'Disbursed', value: 'disbursed' },
  { label: 'Rejected', value: 'rejected' },
];

function SlaIndicator({ app }: { app: LoanApplication }) {
  if (!app.submittedAt || ['approved', 'rejected', 'disbursed', 'cancelled'].includes(app.status)) {
    return null;
  }
  const elapsed = app.elapsedMinutes ?? 0;
  const breached = app.slaBreached ?? false;

  if (breached) {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
        <Clock className="w-3 h-3" /> SLA exceeded ({Math.floor(elapsed)}m)
      </span>
    );
  }
  if (elapsed > 20) {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
        <Clock className="w-3 h-3" /> Approaching SLA ({Math.floor(elapsed)}m)
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
      <Clock className="w-3 h-3" /> {Math.floor(elapsed)}m elapsed
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-[#0F172A]' }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] dark:bg-[#1E293B] flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#9CA3AF] mb-0.5">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function BankDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [apps, setApps] = useState<LoanApplication[]>([]);
  const [analytics, setAnalytics] = useState<BankAnalytics | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Role guard — redirect if not a bank user
  useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/dashboard', { replace: true });
      toast.error('Bank dashboard requires bank officer access.');
    }
  }, [user]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [appsData, analyticsData] = await Promise.all([
        loanApplicationService.bankList(statusFilter || undefined),
        loanApplicationService.bankGetAnalytics(),
      ]);
      setApps(appsData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Access denied. Bank officer or admin role required.');
      } else {
        setError('Unable to load applications.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const approachingSla = apps.filter((a) =>
    !a.slaBreached && (a.elapsedMinutes ?? 0) > 20 &&
    !['approved', 'rejected', 'disbursed', 'cancelled'].includes(a.status)
  );
  const exceededSla = apps.filter((a) =>
    a.slaBreached &&
    !['approved', 'rejected', 'disbursed', 'cancelled'].includes(a.status)
  );

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Bank Loan Dashboard</h2>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Manage and process education loan applications
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 text-[#6B7280] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="card flex items-center gap-3 text-red-600 p-4">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {/* Analytics overview */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Applications" value={String(analytics.totalApplications)} icon={Users} />
          <StatCard label="Pending" value={String(analytics.pendingCount)} icon={Timer} color="text-yellow-600" />
          <StatCard label="Total Approved" value={formatINR(analytics.totalApprovedAmount)} sub={`${analytics.approvalRate}% approval rate`} icon={CheckCircle} color="text-emerald-600" />
          <StatCard label="Avg. Processing" value={`${analytics.avgProcessingMinutes}m`} sub={`${analytics.withinSlaCount} within SLA`} icon={Clock} />
        </div>
      )}

      {/* SLA alerts */}
      {exceededSla.length > 0 && (
        <div className="card border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {exceededSla.length} application{exceededSla.length > 1 ? 's' : ''} exceeded 30-minute SLA
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {exceededSla.map((a) => (
              <Link key={a.id} to={`/bank/applications/${a.applicationId}`}
                className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors font-mono">
                {a.applicationId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {approachingSla.length > 0 && (
        <div className="card border-orange-200 bg-orange-50 dark:bg-orange-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              {approachingSla.length} application{approachingSla.length > 1 ? 's' : ''} approaching 30-minute SLA
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {approachingSla.map((a) => (
              <Link key={a.id} to={`/bank/applications/${a.applicationId}`}
                className="text-xs px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 transition-colors font-mono">
                {a.applicationId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusFilter(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors
              ${statusFilter === t.value
                ? 'bg-[#0F172A] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Applications table */}
      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full mr-3" />
          <p className="text-[#6B7280]">Loading applications...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-[#6B7280]">No applications {statusFilter ? `with status '${statusFilter}'` : 'found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => {
            const statusLabel = STATUS_LABELS[app.status] ?? app.status;
            const statusColor = STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600';
            return (
              <Link
                key={app.id}
                to={`/bank/applications/${app.applicationId}`}
                className="card hover:border-[#0F172A]/20 hover:shadow-sm transition-all block"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-[#0F172A] dark:text-white">{app.applicationId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                      <SlaIndicator app={app} />
                    </div>
                    <p className="text-sm text-[#374151] dark:text-[#D1D5DB] mt-0.5">
                      {app.studentName} — {app.institution}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {app.course} · {app.documents.length} doc{app.documents.length !== 1 ? 's' : ''}
                      {app.submittedAt && ` · Submitted ${new Date(app.submittedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#0F172A] dark:text-white">{formatINR(app.requestedAmount)}</p>
                      <p className="text-xs text-[#9CA3AF]">Requested</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
