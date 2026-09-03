// ── Bank Review Page ──────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loanApplicationService } from '@/services/loanApplicationService';
import type { LoanApplication } from '@/types/loanApplication';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/loanApplication';
import { formatINR } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, XCircle, FileText, AlertCircle,
  Download, User, GraduationCap, DollarSign, Send, TrendingUp,
} from 'lucide-react';

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E7EB] dark:border-white/10">
        <Icon className="w-4 h-4 text-[#6B7280]" />
        <h3 className="font-semibold text-[#0F172A] dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[#F3F4F6] dark:border-white/5 last:border-0 gap-3">
      <span className="text-sm text-[#6B7280] dark:text-[#94A3B8] flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9] text-right">{value}</span>
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-white/10
        bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9]
        text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 ${className}`}
      {...props}
    />
  );
}

type ActionPanel = 'approve' | 'reject' | 'docs' | 'status' | null;

export default function BankReviewPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [app, setApp] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null);
  const [submitting, setSubmitting] = useState(false);

  // Approve form
  const [approvedAmount, setApprovedAmount] = useState('');
  const [interestRate, setInterestRate] = useState('8.5');
  const [tenureMonths, setTenureMonths] = useState('60');
  const [bankNotes, setBankNotes] = useState('');

  // Reject form
  const [rejectionReason, setRejectionReason] = useState('');

  // Docs request form
  const [docsNote, setDocsNote] = useState('');

  // Status update
  const [newStatus, setNewStatus] = useState('under_review');

  useEffect(() => {
    if (user?.role === 'student') {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!applicationId) return;
    loanApplicationService.bankGet(applicationId).then((a) => {
      setApp(a);
      setApprovedAmount(String(a.requestedAmount));
    }).catch(() => {
      toast.error('Application not found');
      navigate('/bank/dashboard');
    }).finally(() => setLoading(false));
  }, [applicationId]);

  const handleApprove = async () => {
    if (!app || !applicationId) return;
    const amt = parseFloat(approvedAmount);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(tenureMonths);
    if (!amt || amt <= 0) { toast.error('Approved amount must be positive'); return; }
    if (isNaN(rate) || rate < 0 || rate > 30) { toast.error('Interest rate must be 0-30%'); return; }
    if (!tenure || tenure < 12 || tenure > 120) { toast.error('Tenure must be 12-120 months'); return; }

    setSubmitting(true);
    try {
      const updated = await loanApplicationService.bankApprove(applicationId, {
        approvedAmount: amt,
        interestRate: rate,
        tenureMonths: tenure,
        bankNotes: bankNotes || undefined,
      });
      setApp(updated);
      setActionPanel(null);
      toast.success(`Loan approved and ₹${amt.toLocaleString('en-IN')} disbursed to student wallet!`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Approval failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!app || !applicationId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      toast.error('Please provide a rejection reason (min 5 characters)');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await loanApplicationService.bankReject(applicationId, {
        rejectionReason,
        bankNotes: bankNotes || undefined,
      });
      setApp(updated);
      setActionPanel(null);
      toast.success('Application rejected. Student has been notified.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Rejection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDocs = async () => {
    if (!app || !applicationId) return;
    if (!docsNote.trim()) { toast.error('Please provide a note describing the required documents'); return; }
    setSubmitting(true);
    try {
      const updated = await loanApplicationService.bankRequestDocuments(applicationId, docsNote);
      setApp(updated);
      setActionPanel(null);
      toast.success('Document request sent to student.');
    } catch (err: any) {
      toast.error('Failed to request documents.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!app || !applicationId) return;
    setSubmitting(true);
    try {
      const updated = await loanApplicationService.bankUpdateStatus(applicationId, newStatus, bankNotes || undefined);
      setApp(updated);
      setActionPanel(null);
      toast.success('Application status updated.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Status update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full mr-3" />
        <p className="text-[#6B7280]">Loading application...</p>
      </div>
    );
  }

  if (!app) return null;

  const statusLabel = STATUS_LABELS[app.status] ?? app.status;
  const statusColor = STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600';
  const isDecided = ['approved', 'rejected', 'disbursed', 'cancelled'].includes(app.status);

  // Eligibility checks (basic internal checks)
  const checks = [
    { ok: !!app.institution, label: 'Institution provided' },
    { ok: !!app.course, label: 'Course information provided' },
    { ok: app.requestedAmount > 0 && app.requestedAmount <= 5_000_000, label: 'Requested amount within limits' },
    { ok: app.documents.length > 0, label: 'At least one document uploaded' },
    { ok: app.requestedAmount <= app.totalEducationCost, label: 'Requested ≤ Total education cost' },
    { ok: !!app.phone, label: 'Contact information provided' },
    { ok: !!app.fullName, label: 'Student name verified' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Link to="/bank/dashboard" className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#374151]" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-white font-mono">{app.applicationId}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
            </div>
            {app.submittedAt && (
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Submitted: {new Date(app.submittedAt).toLocaleString()}
                {app.slaBreached && <span className="ml-2 text-red-500 font-medium">SLA EXCEEDED ({Math.floor(app.elapsedMinutes ?? 0)}m)</span>}
                {!app.slaBreached && (app.elapsedMinutes ?? 0) > 0 && (
                  <span className={`ml-2 font-medium ${(app.elapsedMinutes ?? 0) > 20 ? 'text-orange-500' : 'text-green-600'}`}>
                    {Math.floor(app.elapsedMinutes ?? 0)}m elapsed
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons (only if not yet decided) */}
        {!isDecided && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActionPanel('approve')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
            <button onClick={() => setActionPanel('reject')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button onClick={() => setActionPanel('docs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <FileText className="w-4 h-4" /> Request Docs
            </button>
            <button onClick={() => setActionPanel('status')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <Send className="w-4 h-4" /> Update Status
            </button>
          </div>
        )}
      </div>

      {/* Action panels */}
      {actionPanel === 'approve' && (
        <div className="card border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-4">Approve Loan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Approved Amount (₹) *</label>
              <Input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Interest Rate (% p.a.)</label>
              <Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Tenure (months)</label>
              <Input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[#374151] mb-1">Bank Notes (optional)</label>
            <Input value={bankNotes} onChange={(e) => setBankNotes(e.target.value)} placeholder="Internal notes..." />
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-sm text-emerald-800 dark:text-emerald-300 mb-3">
            <strong>This will immediately disburse ₹{parseFloat(approvedAmount || '0').toLocaleString('en-IN')} to the student's wallet.</strong> This action cannot be undone.
          </div>
          <div className="flex gap-2">
            <button onClick={handleApprove} disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
              {submitting ? 'Processing...' : 'Confirm Approval & Disburse'}
            </button>
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {actionPanel === 'reject' && (
        <div className="card border-red-200 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-4">Reject Application</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[#374151] mb-1">Rejection Reason *</label>
            <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide a clear reason..." />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[#374151] mb-1">Internal Notes (optional)</label>
            <Input value={bankNotes} onChange={(e) => setBankNotes(e.target.value)} placeholder="Internal notes not shared with student..." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleReject} disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {actionPanel === 'docs' && (
        <div className="card border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-4">Request Additional Documents</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[#374151] mb-1">Note for Student *</label>
            <Input value={docsNote} onChange={(e) => setDocsNote(e.target.value)} placeholder="Describe the documents required..." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleRequestDocs} disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60">
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {actionPanel === 'status' && (
        <div className="card">
          <h3 className="font-semibold text-[#0F172A] dark:text-white mb-4">Update Status</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">New Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#1E293B] text-sm">
                <option value="under_review">Under Review</option>
                <option value="verification_pending">Verification Pending</option>
                <option value="documents_required">Documents Required</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Notes</label>
              <Input value={bankNotes} onChange={(e) => setBankNotes(e.target.value)} placeholder="Optional..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleStatusUpdate} disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors disabled:opacity-60">
              {submitting ? 'Updating...' : 'Update Status'}
            </button>
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Application details sections */}
      <Section title="Student Details" icon={User}>
        <Row label="Full Name" value={app.fullName} />
        <Row label="Account Name" value={app.studentName} />
        <Row label="Email" value={app.studentEmail} />
        <Row label="Phone" value={app.phone} />
        <Row label="Date of Birth" value={app.dateOfBirth} />
      </Section>

      <Section title="Education Details" icon={GraduationCap}>
        <Row label="Institution" value={app.institution} />
        <Row label="Course" value={app.course} />
        <Row label="Duration" value={`${app.courseDurationYears} year(s)`} />
        <Row label="Current Year / Semester" value={app.currentYearSemester} />
        <Row label="Annual Tuition Fee" value={formatINR(app.tuitionFee)} />
        <Row label="Other Expenses" value={formatINR(app.otherExpenses)} />
        <Row label="Total Education Cost" value={<span className="font-bold">{formatINR(app.totalEducationCost)}</span>} />
      </Section>

      <Section title="Loan Details" icon={DollarSign}>
        <Row label="Requested Amount" value={<span className="font-bold text-lg">{formatINR(app.requestedAmount)}</span>} />
        <Row label="Repayment Period" value={`${app.repaymentPeriodMonths} months`} />
        {app.purposeNotes && <Row label="Purpose Notes" value={app.purposeNotes} />}
      </Section>

      {(app.annualFamilyIncome || app.coApplicantName || app.existingObligations) && (
        <Section title="Financial Information" icon={TrendingUp as React.ElementType}>
          {app.annualFamilyIncome && <Row label="Annual Family Income" value={formatINR(app.annualFamilyIncome)} />}
          {app.coApplicantName && <Row label="Co-Applicant" value={`${app.coApplicantName} (${app.coApplicantRelation ?? 'N/A'})`} />}
          {app.coApplicantIncome && <Row label="Co-Applicant Income" value={formatINR(app.coApplicantIncome)} />}
          {app.existingObligations != null && <Row label="Existing Obligations" value={formatINR(app.existingObligations)} />}
        </Section>
      )}

      {/* Eligibility checks */}
      <Section title="Internal Eligibility Checks" icon={CheckCircle}>
        <p className="text-xs text-[#9CA3AF] mb-3">These are preliminary automated checks. Final decision rests with the authorized officer.</p>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              }
              <span className={c.ok ? 'text-[#374151] dark:text-[#D1D5DB]' : 'text-orange-600 dark:text-orange-400'}>{c.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Documents */}
      <Section title={`Documents (${app.documents.length})`} icon={FileText}>
        {app.documents.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {app.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] dark:text-white truncate">{doc.originalFilename}</p>
                  <p className="text-xs text-[#9CA3AF]">{doc.documentType} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB · {doc.mimeType}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${doc.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {doc.status}
                  </span>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/bank/loan-applications/${app.applicationId}/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async (e) => {
                      // Use axios token via a direct fetch with Authorization header
                      e.preventDefault();
                      const token = sessionStorage.getItem('finwise_token');
                      const url = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/bank/loan-applications/${app.applicationId}/documents/${doc.id}`;
                      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                      const blob = await res.blob();
                      const a2 = document.createElement('a');
                      a2.href = URL.createObjectURL(blob);
                      a2.download = doc.originalFilename;
                      a2.click();
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#0F172A] text-white hover:bg-[#1E293B] transition-colors"
                  >
                    <Download className="w-3 h-3" /> View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Bank decision info */}
      {(app.bankNotes || app.rejectionReason) && (
        <Section title="Decision Details" icon={FileText}>
          {app.bankNotes && <Row label="Bank Notes" value={app.bankNotes} />}
          {app.rejectionReason && <Row label="Rejection Reason" value={app.rejectionReason} />}
          {app.decisionAt && <Row label="Decision Time" value={new Date(app.decisionAt).toLocaleString()} />}
        </Section>
      )}
    </div>
  );
}
