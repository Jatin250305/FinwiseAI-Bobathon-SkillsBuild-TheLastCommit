// ── My Loan Applications Page (Student) ──────────────────────────────────────
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { loanApplicationService } from '@/services/loanApplicationService';
import type { LoanApplication, EducationLoan } from '@/types/loanApplication';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/loanApplication';
import { formatINR } from '@/utils/helpers';
import toast from 'react-hot-toast';
import {
  GraduationCap, Upload, RefreshCw, Plus, Clock, CheckCircle, XCircle,
  FileText, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

const DOCUMENT_TYPES = [
  { value: 'student_id', label: 'Student ID' },
  { value: 'admission_proof', label: 'Admission / Enrollment Proof' },
  { value: 'fee_structure', label: 'Fee Structure' },
  { value: 'marksheet', label: 'Marksheet / Transcripts' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'co_applicant_id', label: 'Co-Applicant ID' },
  { value: 'co_applicant_income_proof', label: 'Co-Applicant Income Proof' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'other', label: 'Other' },
];

function SlaTimer({ app }: { app: LoanApplication }) {
  if (!app.submittedAt) return null;
  const elapsed = app.elapsedMinutes ?? 0;
  const breached = app.slaBreached ?? false;

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium
      ${breached ? 'bg-red-100 text-red-700' : elapsed > 20 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
      <Clock className="w-3 h-3" />
      {breached
        ? `SLA exceeded (${Math.floor(elapsed)}m)`
        : elapsed > 20
        ? `Approaching SLA (${Math.floor(elapsed)}m elapsed)`
        : `${Math.floor(elapsed)}m elapsed`}
    </div>
  );
}

function ApplicationCard({ app, onRefresh }: { app: LoanApplication; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('student_id');
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = !['approved', 'rejected', 'disbursed', 'cancelled'].includes(app.status);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await loanApplicationService.uploadDocument(app.applicationId, docType, file);
      toast.success('Document uploaded successfully');
      onRefresh();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Upload failed. Ensure file is PDF/image under 10MB.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const statusLabel = STATUS_LABELS[app.status] ?? app.status;
  const statusColor = STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="card">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-[#0F172A] dark:text-white">{app.applicationId}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{app.institution} — {app.course}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-[#0F172A] dark:text-white">{formatINR(app.requestedAmount)}</p>
          <p className="text-xs text-[#9CA3AF]">Requested</p>
        </div>
      </div>

      {/* SLA & submission time */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {app.submittedAt && (
          <span className="text-xs text-[#9CA3AF]">
            Submitted: {new Date(app.submittedAt).toLocaleString()}
          </span>
        )}
        {app.status === 'submitted' || app.status === 'under_review' ? <SlaTimer app={app} /> : null}
      </div>

      {/* Status-specific messages */}
      {app.status === 'documents_required' && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Documents Required</p>
            {app.bankNotes && <p className="mt-0.5">{app.bankNotes}</p>}
          </div>
        </div>
      )}

      {app.status === 'rejected' && app.rejectionReason && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
          <p className="font-medium">Application not approved</p>
          <p className="mt-0.5">{app.rejectionReason}</p>
        </div>
      )}

      {app.status === 'disbursed' && (
        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Loan approved and disbursed to your wallet!
            {app.decisionAt && ` Disbursed on ${new Date(app.decisionAt).toLocaleDateString()}.`}
          </p>
        </div>
      )}

      {/* Expand / collapse for documents */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#0F172A] dark:hover:text-white transition-colors"
      >
        <FileText className="w-3 h-3" />
        {app.documents.length} document{app.documents.length !== 1 ? 's' : ''} uploaded
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {app.documents.length > 0 ? (
            app.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-lg">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#0F172A] dark:text-white truncate">{doc.originalFilename}</p>
                  <p className="text-xs text-[#9CA3AF]">{doc.documentType} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${doc.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {doc.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#9CA3AF]">No documents uploaded yet.</p>
          )}

          {/* Upload new document */}
          {canUpload && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E5E7EB] dark:border-white/10">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9]"
              >
                {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#0F172A] text-white hover:bg-[#1E293B] transition-colors disabled:opacity-60 flex-shrink-0"
              >
                <Upload className="w-3 h-3" /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoanCard({ loan }: { loan: EducationLoan }) {
  return (
    <div className="card border-l-4 border-l-emerald-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-[#0F172A] dark:text-white">{loan.loanId}</p>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Education Loan</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
          {loan.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-[#9CA3AF]">Approved Amount</p>
          <p className="font-bold text-[#0F172A] dark:text-white">{formatINR(loan.approvedAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Interest Rate</p>
          <p className="font-bold text-[#0F172A] dark:text-white">{loan.interestRate}% p.a.</p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Tenure</p>
          <p className="font-semibold text-[#0F172A] dark:text-white">{loan.tenureMonths} months</p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Disbursed</p>
          <p className="font-semibold text-[#0F172A] dark:text-white">
            {loan.disbursedAt ? new Date(loan.disbursedAt).toLocaleDateString() : 'Pending'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MyLoanApplicationsPage() {
  const [apps, setApps] = useState<LoanApplication[]>([]);
  const [loans, setLoans] = useState<EducationLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [appsData, loansData] = await Promise.all([
        loanApplicationService.list(),
        loanApplicationService.listMyLoans(),
      ]);
      setApps(appsData);
      setLoans(loansData);
    } catch {
      setError('Unable to load your loan applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="page-title">My Education Loans</h2>
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Track your loan applications and disbursed loans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-[#6B7280] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/loans/apply"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Application
          </Link>
        </div>
      </div>

      {loading && (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full mr-3" />
          <p className="text-[#6B7280]">Loading...</p>
        </div>
      )}

      {error && (
        <div className="card flex items-center gap-3 text-red-600 p-4">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Disbursed loans */}
          {loans.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide mb-3">
                My Education Loans
              </h3>
              <div className="space-y-3">
                {loans.map((l) => <LoanCard key={l.id} loan={l} />)}
              </div>
            </section>
          )}

          {/* Applications */}
          <section>
            <h3 className="text-sm font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wide mb-3">
              Applications ({apps.length})
            </h3>
            {apps.length === 0 ? (
              <div className="card text-center py-12">
                <GraduationCap className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-[#6B7280] font-medium">No applications yet</p>
                <p className="text-sm text-[#9CA3AF] mt-1">Apply for an education loan to get started.</p>
                <Link to="/loans/apply" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors">
                  <Plus className="w-4 h-4" /> Apply Now
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => (
                  <ApplicationCard key={a.id} app={a} onRefresh={load} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
