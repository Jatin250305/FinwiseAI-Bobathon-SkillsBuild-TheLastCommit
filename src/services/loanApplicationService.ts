// ── Loan Application Service ──────────────────────────────────────────────────
import apiClient from './api';
import type {
  LoanApplication,
  LoanApplicationCreate,
  LoanDocument,
  EducationLoan,
  ApproveRequest,
  RejectRequest,
  LoanAnalytics,
  BankAnalytics,
} from '@/types/loanApplication';

// Helper to convert camelCase keys to snake_case for the backend
function toSnake(body: LoanApplicationCreate) {
  return {
    full_name: body.fullName,
    phone: body.phone,
    date_of_birth: body.dateOfBirth,
    institution: body.institution,
    course: body.course,
    course_duration_years: body.courseDurationYears,
    current_year_semester: body.currentYearSemester,
    tuition_fee: body.tuitionFee,
    other_expenses: body.otherExpenses,
    total_education_cost: body.totalEducationCost,
    requested_amount: body.requestedAmount,
    repayment_period_months: body.repaymentPeriodMonths,
    annual_family_income: body.annualFamilyIncome,
    co_applicant_name: body.coApplicantName,
    co_applicant_relation: body.coApplicantRelation,
    co_applicant_income: body.coApplicantIncome,
    existing_obligations: body.existingObligations,
    purpose_notes: body.purposeNotes,
  };
}

export const loanApplicationService = {
  // ── Student endpoints ─────────────────────────────────────────────────────

  async create(data: LoanApplicationCreate): Promise<LoanApplication> {
    const { data: res } = await apiClient.post<LoanApplication>('/edu-loans/applications', toSnake(data));
    return res;
  },

  async list(): Promise<LoanApplication[]> {
    const { data } = await apiClient.get<LoanApplication[]>('/edu-loans/applications');
    return data;
  },

  async get(applicationId: string): Promise<LoanApplication> {
    const { data } = await apiClient.get<LoanApplication>(`/edu-loans/applications/${applicationId}`);
    return data;
  },

  async uploadDocument(applicationId: string, documentType: string, file: File): Promise<LoanDocument> {
    const form = new FormData();
    form.append('document_type', documentType);
    form.append('file', file);
    const { data } = await apiClient.post<LoanDocument>(
      `/edu-loans/applications/${applicationId}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  getDocumentUrl(applicationId: string, documentId: string): string {
    return `/edu-loans/applications/${applicationId}/documents/${documentId}`;
  },

  async getMyLoan(): Promise<EducationLoan | null> {
    const { data } = await apiClient.get<EducationLoan | null>('/edu-loans/my-loan');
    return data;
  },

  async listMyLoans(): Promise<EducationLoan[]> {
    const { data } = await apiClient.get<EducationLoan[]>('/edu-loans/my-loans');
    return data;
  },

  async getAnalytics(): Promise<LoanAnalytics> {
    const { data } = await apiClient.get<LoanAnalytics>('/edu-loans/analytics');
    return data;
  },

  // ── Bank officer endpoints ──────────────────────────────────────────────────

  async bankList(statusFilter?: string): Promise<LoanApplication[]> {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await apiClient.get<LoanApplication[]>('/bank/loan-applications', { params });
    return data;
  },

  async bankGet(applicationId: string): Promise<LoanApplication> {
    const { data } = await apiClient.get<LoanApplication>(`/bank/loan-applications/${applicationId}`);
    return data;
  },

  async bankUpdateStatus(applicationId: string, status: string, bankNotes?: string): Promise<LoanApplication> {
    const { data } = await apiClient.patch<LoanApplication>(
      `/bank/loan-applications/${applicationId}/status`,
      { status, bank_notes: bankNotes },
    );
    return data;
  },

  async bankApprove(applicationId: string, body: ApproveRequest): Promise<LoanApplication> {
    const { data } = await apiClient.post<LoanApplication>(
      `/bank/loan-applications/${applicationId}/approve`,
      {
        approved_amount: body.approvedAmount,
        interest_rate: body.interestRate,
        tenure_months: body.tenureMonths,
        bank_notes: body.bankNotes,
      },
    );
    return data;
  },

  async bankReject(applicationId: string, body: RejectRequest): Promise<LoanApplication> {
    const { data } = await apiClient.post<LoanApplication>(
      `/bank/loan-applications/${applicationId}/reject`,
      { rejection_reason: body.rejectionReason, bank_notes: body.bankNotes },
    );
    return data;
  },

  async bankRequestDocuments(applicationId: string, bankNotes: string): Promise<LoanApplication> {
    const { data } = await apiClient.post<LoanApplication>(
      `/bank/loan-applications/${applicationId}/request-documents`,
      { bank_notes: bankNotes },
    );
    return data;
  },

  bankGetDocumentUrl(applicationId: string, documentId: string): string {
    return `/bank/loan-applications/${applicationId}/documents/${documentId}`;
  },

  async bankGetAnalytics(): Promise<BankAnalytics> {
    const { data } = await apiClient.get<BankAnalytics>('/bank/loan-analytics');
    return data;
  },
};
