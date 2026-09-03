// ── Education Loan Application Page (3-step form) ─────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loanApplicationService } from '@/services/loanApplicationService';
import type { LoanApplicationCreate } from '@/types/loanApplication';
import { formatINR } from '@/utils/helpers';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, GraduationCap, Upload } from 'lucide-react';

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1 as Step, label: 'Student Info' },
  { n: 2 as Step, label: 'Education & Loan' },
  { n: 3 as Step, label: 'Financial Info' },
];

const REPAYMENT_OPTIONS = [
  { value: 12, label: '1 Year (12 months)' },
  { value: 24, label: '2 Years (24 months)' },
  { value: 36, label: '3 Years (36 months)' },
  { value: 48, label: '4 Years (48 months)' },
  { value: 60, label: '5 Years (60 months)' },
  { value: 84, label: '7 Years (84 months)' },
  { value: 120, label: '10 Years (120 months)' },
];

interface FormErrors {
  [key: string]: string;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-white/10
        bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9]
        text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 dark:focus:ring-white/20
        placeholder:text-[#9CA3AF] ${className}`}
      {...props}
    />
  );
}

function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select
      className={`w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-white/10
        bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9]
        text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 dark:focus:ring-white/20 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export default function LoanApplicationPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<LoanApplicationCreate>({
    fullName: user?.name ?? '',
    phone: '',
    dateOfBirth: '',
    institution: '',
    course: '',
    courseDurationYears: 4,
    currentYearSemester: '',
    tuitionFee: 0,
    otherExpenses: 0,
    totalEducationCost: 0,
    requestedAmount: 0,
    repaymentPeriodMonths: 60,
    annualFamilyIncome: undefined,
    coApplicantName: undefined,
    coApplicantRelation: undefined,
    coApplicantIncome: undefined,
    existingObligations: undefined,
    purposeNotes: '',
  });

  const set = (field: keyof LoanApplicationCreate, value: string | number | undefined) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-compute total education cost
      if (field === 'tuitionFee' || field === 'otherExpenses') {
        const tf = field === 'tuitionFee' ? (Number(value) || 0) : (prev.tuitionFee || 0);
        const oe = field === 'otherExpenses' ? (Number(value) || 0) : (prev.otherExpenses || 0);
        updated.totalEducationCost = Math.round((tf + oe) * 100) / 100;
      }
      return updated;
    });
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validateStep1 = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Full name is required (min 2 chars)';
    if (!/^\+?[0-9]{7,15}$/.test(form.phone)) e.phone = 'Valid phone number required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    else {
      const age = Math.floor((Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
      if (age < 15 || age > 70) e.dateOfBirth = 'Age must be between 15 and 70';
    }
    return e;
  };

  const validateStep2 = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.institution.trim() || form.institution.trim().length < 3) e.institution = 'Institution name is required';
    if (!form.course.trim() || form.course.trim().length < 2) e.course = 'Course name is required';
    if (!form.currentYearSemester.trim()) e.currentYearSemester = 'Current year/semester is required';
    if (form.tuitionFee <= 0) e.tuitionFee = 'Tuition fee must be positive';
    if (form.requestedAmount <= 0) e.requestedAmount = 'Requested amount must be positive';
    if (form.requestedAmount > form.totalEducationCost) e.requestedAmount = 'Requested amount cannot exceed total education cost';
    if (form.requestedAmount > 5_000_000) e.requestedAmount = 'Requested amount cannot exceed ₹50,00,000';
    return e;
  };

  const next = () => {
    const errs = step === 1 ? validateStep1() : step === 2 ? validateStep2() : {};
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => (s + 1) as Step);
  };

  const submit = async () => {
    const errs = { ...validateStep1(), ...validateStep2() };
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const app = await loanApplicationService.create(form);
      toast.success(`Application ${app.applicationId} submitted successfully!`);
      navigate('/loans/my-applications');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        const fieldErrs: FormErrors = {};
        detail.forEach((d: any) => {
          const field = d.loc?.[d.loc.length - 1];
          if (field) fieldErrs[field] = d.msg;
        });
        setErrors(fieldErrs);
        toast.error('Please fix validation errors and try again.');
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Failed to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">Apply for Education Loan</h2>
            <p className="page-subtitle text-sm text-[#6B7280]">Complete all 3 steps to submit your application</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'bg-[#0F172A] text-white' : 'bg-[#E5E7EB] text-[#6B7280]'}`}>
                {step > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-[#0F172A] dark:text-white' : 'text-[#9CA3AF]'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${step > s.n ? 'bg-green-300' : 'bg-[#E5E7EB]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Student Info */}
      {step === 1 && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-[#0F172A] dark:text-white">Student Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="As per official documents" />
              <FieldError error={errors.fullName} />
            </div>
            <div>
              <Label required>Phone Number</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 9876543210" />
              <FieldError error={errors.phone} />
            </div>
            <div>
              <Label required>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
              <FieldError error={errors.dateOfBirth} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="opacity-60 cursor-not-allowed" />
              <p className="text-xs text-[#9CA3AF] mt-1">From your account</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Education & Loan Details */}
      {step === 2 && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-[#0F172A] dark:text-white">Education & Loan Details</h3>

          <div>
            <Label required>Institution / College / University</Label>
            <Input value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. IIT Bombay" />
            <FieldError error={errors.institution} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Course / Program</Label>
              <Input value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="e.g. B.Tech Computer Science" />
              <FieldError error={errors.course} />
            </div>
            <div>
              <Label required>Current Year / Semester</Label>
              <Input value={form.currentYearSemester} onChange={(e) => set('currentYearSemester', e.target.value)} placeholder="e.g. 2nd Year / Sem 3" />
              <FieldError error={errors.currentYearSemester} />
            </div>
            <div>
              <Label required>Course Duration (Years)</Label>
              <Select value={form.courseDurationYears} onChange={(e) => set('courseDurationYears', Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => <option key={y} value={y}>{y} Year{y > 1 ? 's' : ''}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Annual Tuition Fee (₹)</Label>
              <Input type="number" min={0} value={form.tuitionFee || ''} onChange={(e) => set('tuitionFee', parseFloat(e.target.value) || 0)} placeholder="500000" />
              <FieldError error={errors.tuitionFee} />
            </div>
            <div>
              <Label>Other Annual Expenses (₹)</Label>
              <Input type="number" min={0} value={form.otherExpenses || ''} onChange={(e) => set('otherExpenses', parseFloat(e.target.value) || 0)} placeholder="100000" />
            </div>
          </div>

          <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-lg">
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Total Education Cost (auto-calculated)</p>
            <p className="text-lg font-bold text-[#0F172A] dark:text-white">{formatINR(form.totalEducationCost)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Requested Loan Amount (₹)</Label>
              <Input type="number" min={1} max={5000000} value={form.requestedAmount || ''} onChange={(e) => set('requestedAmount', parseFloat(e.target.value) || 0)} placeholder="500000" />
              <FieldError error={errors.requestedAmount} />
            </div>
            <div>
              <Label required>Repayment Period</Label>
              <Select value={form.repaymentPeriodMonths} onChange={(e) => set('repaymentPeriodMonths', Number(e.target.value))}>
                {REPAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Financial Info + Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h3 className="font-semibold text-[#0F172A] dark:text-white">Financial Information <span className="text-xs font-normal text-[#9CA3AF]">(optional)</span></h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Annual Family Income (₹)</Label>
                <Input type="number" min={0} value={form.annualFamilyIncome ?? ''} onChange={(e) => set('annualFamilyIncome', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="600000" />
              </div>
              <div>
                <Label>Existing Obligations / EMI (₹)</Label>
                <Input type="number" min={0} value={form.existingObligations ?? ''} onChange={(e) => set('existingObligations', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="0" />
              </div>
              <div>
                <Label>Co-Applicant Name</Label>
                <Input value={form.coApplicantName ?? ''} onChange={(e) => set('coApplicantName', e.target.value || undefined)} placeholder="Parent / Guardian name" />
              </div>
              <div>
                <Label>Co-Applicant Relation</Label>
                <Select value={form.coApplicantRelation ?? ''} onChange={(e) => set('coApplicantRelation', e.target.value || undefined)}>
                  <option value="">Select relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Co-Applicant Annual Income (₹)</Label>
                <Input type="number" min={0} value={form.coApplicantIncome ?? ''} onChange={(e) => set('coApplicantIncome', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="400000" />
              </div>
            </div>

            <div>
              <Label>Purpose / Additional Notes</Label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-white/10
                  bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F1F5F9] text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 resize-none"
                rows={3}
                value={form.purposeNotes ?? ''}
                onChange={(e) => set('purposeNotes', e.target.value || undefined)}
                placeholder="Any additional information you'd like to provide..."
              />
            </div>
          </div>

          {/* Summary */}
          <div className="card bg-[#F8FAFC] dark:bg-[#1E293B]">
            <h3 className="font-semibold text-[#0F172A] dark:text-white mb-3">Application Summary</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Applicant', form.fullName],
                ['Institution', form.institution],
                ['Course', `${form.course} (${form.courseDurationYears} yr)`],
                ['Semester', form.currentYearSemester],
                ['Total Education Cost', formatINR(form.totalEducationCost)],
                ['Requested Amount', formatINR(form.requestedAmount)],
                ['Repayment Period', `${form.repaymentPeriodMonths} months`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#94A3B8]">{label}</span>
                  <span className="font-medium text-[#0F172A] dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Upload className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>After submission, you can upload supporting documents (ID, admission proof, fee structure, etc.) from the My Applications page.</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <button onClick={() => setStep((s) => (s - 1) as Step)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        ) : <div />}

        {step < 3 ? (
          <button onClick={next} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
}
