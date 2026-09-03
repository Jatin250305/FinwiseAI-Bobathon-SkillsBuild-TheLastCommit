// ── Education Loan Application Types ─────────────────────────────────────────

export type LoanApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'documents_required'
  | 'verification_pending'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'cancelled';

export type EducationLoanStatus =
  | 'approved'
  | 'disbursement_pending'
  | 'disbursed'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface LoanDocument {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: 'uploaded' | 'verified' | 'rejected';
  uploadedAt: string;
}

export interface LoanApplication {
  id: string;
  applicationId: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  institution: string;
  course: string;
  courseDurationYears: number;
  currentYearSemester: string;
  tuitionFee: number;
  otherExpenses: number;
  totalEducationCost: number;
  requestedAmount: number;
  repaymentPeriodMonths: number;
  annualFamilyIncome: number | null;
  coApplicantName: string | null;
  coApplicantRelation: string | null;
  coApplicantIncome: number | null;
  existingObligations: number | null;
  purposeNotes: string | null;
  status: LoanApplicationStatus;
  submittedAt: string | null;
  slaDeadline: string | null;
  reviewedAt: string | null;
  decisionAt: string | null;
  bankNotes: string | null;
  rejectionReason: string | null;
  documents: LoanDocument[];
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  slaBreached: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface EducationLoan {
  id: string;
  loanId: string;
  applicationId: string;
  studentUserId: string;
  approvedAmount: number;
  interestRate: number;
  tenureMonths: number;
  repaymentFrequency: string;
  status: EducationLoanStatus;
  approvedBy: string;
  approvedAt: string;
  disbursedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanApplicationCreate {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  institution: string;
  course: string;
  courseDurationYears: number;
  currentYearSemester: string;
  tuitionFee: number;
  otherExpenses: number;
  totalEducationCost: number;
  requestedAmount: number;
  repaymentPeriodMonths: number;
  annualFamilyIncome?: number;
  coApplicantName?: string;
  coApplicantRelation?: string;
  coApplicantIncome?: number;
  existingObligations?: number;
  purposeNotes?: string;
}

export interface ApproveRequest {
  approvedAmount: number;
  interestRate: number;
  tenureMonths: number;
  bankNotes?: string;
}

export interface RejectRequest {
  rejectionReason: string;
  bankNotes?: string;
}

export interface LoanAnalytics {
  totalRequested: number;
  totalApproved: number;
  totalDisbursed: number;
  applicationCount: number;
  activeLoans: number;
  pendingApplications: number;
  rejectedApplications: number;
}

export interface BankAnalytics {
  totalApplications: number;
  totalRequestedAmount: number;
  totalApprovedAmount: number;
  totalRejectedAmount: number;
  totalDisbursedAmount: number;
  avgProcessingMinutes: number;
  withinSlaCount: number;
  exceededSlaCount: number;
  pendingCount: number;
  awaitingDocumentsCount: number;
  approvalRate: number;
}

// Status display helpers
export const STATUS_LABELS: Record<LoanApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  documents_required: 'Documents Required',
  verification_pending: 'Verification Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  disbursed: 'Disbursed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<LoanApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  documents_required: 'bg-orange-100 text-orange-700',
  verification_pending: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
