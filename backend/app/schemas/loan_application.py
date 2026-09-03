"""
Pydantic schemas for education loan application system.
All validation enforced server-side — the frontend may submit but backend rejects invalid data.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, field_validator, model_validator
import re


# ─── Helpers ──────────────────────────────────────────────────────────────────

_PHONE_RE = re.compile(r"^\+?[0-9]{7,15}$")

# Maximum loan amount the system will accept (bank-configurable; hard ceiling here)
MAX_LOAN_AMOUNT = 5_000_000.0   # ₹50 lakh


# ─── Request bodies ───────────────────────────────────────────────────────────

class LoanApplicationCreate(BaseModel):
    """Submitted by a student to create a new application."""

    # Student information
    full_name: str
    phone: str
    date_of_birth: str          # YYYY-MM-DD

    # Education information
    institution: str
    course: str
    course_duration_years: int
    current_year_semester: str

    # Loan details
    tuition_fee: float
    other_expenses: float = 0.0
    total_education_cost: float
    requested_amount: float
    repayment_period_months: int

    # Financial information (optional)
    annual_family_income: Optional[float] = None
    co_applicant_name: Optional[str] = None
    co_applicant_relation: Optional[str] = None
    co_applicant_income: Optional[float] = None
    existing_obligations: Optional[float] = None
    purpose_notes: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 120:
            raise ValueError("Full name too long")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        import datetime
        try:
            d = datetime.date.fromisoformat(v)
        except ValueError:
            raise ValueError("date_of_birth must be YYYY-MM-DD")
        today = datetime.date.today()
        age = (today - d).days // 365
        if age < 15 or age > 70:
            raise ValueError("Date of birth must correspond to an age between 15 and 70")
        return v

    @field_validator("institution")
    @classmethod
    def validate_institution(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Institution name too short")
        return v

    @field_validator("course")
    @classmethod
    def validate_course(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Course name too short")
        return v

    @field_validator("course_duration_years")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("Course duration must be between 1 and 10 years")
        return v

    @field_validator("tuition_fee")
    @classmethod
    def validate_tuition(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Tuition fee cannot be negative")
        if v > MAX_LOAN_AMOUNT:
            raise ValueError(f"Tuition fee exceeds maximum limit of ₹{MAX_LOAN_AMOUNT:,.0f}")
        return round(v, 2)

    @field_validator("other_expenses")
    @classmethod
    def validate_other_expenses(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Other expenses cannot be negative")
        return round(v, 2)

    @field_validator("requested_amount")
    @classmethod
    def validate_requested(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Requested amount must be positive")
        if v > MAX_LOAN_AMOUNT:
            raise ValueError(f"Requested amount exceeds maximum limit of ₹{MAX_LOAN_AMOUNT:,.0f}")
        return round(v, 2)

    @field_validator("repayment_period_months")
    @classmethod
    def validate_repayment_period(cls, v: int) -> int:
        if v < 12 or v > 120:
            raise ValueError("Repayment period must be between 12 and 120 months")
        return v

    @model_validator(mode="after")
    def validate_amounts(self) -> LoanApplicationCreate:
        total = round(self.tuition_fee + self.other_expenses, 2)
        if abs(total - self.total_education_cost) > 1.0:
            raise ValueError(
                "total_education_cost must equal tuition_fee + other_expenses "
                f"(expected ~{total:,.2f}, got {self.total_education_cost:,.2f})"
            )
        if self.requested_amount > self.total_education_cost:
            raise ValueError("Requested amount cannot exceed total education cost")
        return self


class BankStatusUpdate(BaseModel):
    """Bank officer updates an application's status."""
    status: str
    bank_notes: Optional[str] = None
    rejection_reason: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {
            "under_review", "documents_required",
            "verification_pending", "approved", "rejected", "cancelled",
        }
        if v not in allowed:
            raise ValueError(f"Invalid status. Allowed: {sorted(allowed)}")
        return v


class ApproveRequest(BaseModel):
    """Bank officer approves a loan with specific terms."""
    approved_amount: float
    interest_rate: float = 0.0
    tenure_months: int
    bank_notes: Optional[str] = None

    @field_validator("approved_amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Approved amount must be positive")
        if v > MAX_LOAN_AMOUNT:
            raise ValueError(f"Approved amount exceeds maximum limit ₹{MAX_LOAN_AMOUNT:,.0f}")
        return round(v, 2)

    @field_validator("interest_rate")
    @classmethod
    def valid_rate(cls, v: float) -> float:
        if v < 0 or v > 30:
            raise ValueError("Interest rate must be between 0% and 30%")
        return round(v, 4)

    @field_validator("tenure_months")
    @classmethod
    def valid_tenure(cls, v: int) -> int:
        if v < 12 or v > 120:
            raise ValueError("Tenure must be between 12 and 120 months")
        return v


class RejectRequest(BaseModel):
    rejection_reason: str
    bank_notes: Optional[str] = None

    @field_validator("rejection_reason")
    @classmethod
    def non_empty_reason(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Rejection reason must be at least 5 characters")
        return v


class RequestDocumentsRequest(BaseModel):
    bank_notes: str

    @field_validator("bank_notes")
    @classmethod
    def non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("bank_notes cannot be empty")
        return v.strip()


# ─── Response shapes ──────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    documentType: str
    originalFilename: str
    mimeType: str
    fileSizeBytes: int
    status: str
    uploadedAt: str

    model_config = {"from_attributes": True}


class LoanApplicationOut(BaseModel):
    id: str
    applicationId: str
    studentUserId: str
    studentName: str
    studentEmail: str
    fullName: str
    phone: str
    dateOfBirth: str
    institution: str
    course: str
    courseDurationYears: int
    currentYearSemester: str
    tuitionFee: float
    otherExpenses: float
    totalEducationCost: float
    requestedAmount: float
    repaymentPeriodMonths: int
    annualFamilyIncome: Optional[float]
    coApplicantName: Optional[str]
    coApplicantRelation: Optional[str]
    coApplicantIncome: Optional[float]
    existingObligations: Optional[float]
    purposeNotes: Optional[str]
    status: str
    submittedAt: Optional[str]
    slaDeadline: Optional[str]
    reviewedAt: Optional[str]
    decisionAt: Optional[str]
    bankNotes: Optional[str]
    rejectionReason: Optional[str]
    documents: List[DocumentOut] = []
    # SLA helper fields computed by backend
    elapsedMinutes: Optional[float] = None
    remainingMinutes: Optional[float] = None
    slaBreached: Optional[bool] = None
    createdAt: str
    updatedAt: str

    model_config = {"from_attributes": True}


class EducationLoanOut(BaseModel):
    id: str
    loanId: str
    applicationId: str
    studentUserId: str
    approvedAmount: float
    interestRate: float
    tenureMonths: int
    repaymentFrequency: str
    status: str
    approvedBy: str
    approvedAt: str
    disbursedAt: Optional[str]
    createdAt: str
    updatedAt: str

    model_config = {"from_attributes": True}


class LoanAnalyticsOut(BaseModel):
    """Student-facing loan analytics."""
    totalRequested: float
    totalApproved: float
    totalDisbursed: float
    applicationCount: int
    activeLoans: int
    pendingApplications: int
    rejectedApplications: int


class BankAnalyticsOut(BaseModel):
    """Bank-officer-facing analytics."""
    totalApplications: int
    totalRequestedAmount: float
    totalApprovedAmount: float
    totalRejectedAmount: float
    totalDisbursedAmount: float
    avgProcessingMinutes: float
    withinSlaCount: int
    exceededSlaCount: int
    pendingCount: int
    awaitingDocumentsCount: int
    approvalRate: float
