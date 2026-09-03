import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Role constants ────────────────────────────────────────────────────────────
ROLE_STUDENT = "student"
ROLE_BANK_OFFICER = "bank_officer"
ROLE_BANK_ADMIN = "bank_admin"

# ─── Loan application status constants ────────────────────────────────────────
LA_DRAFT = "draft"
LA_SUBMITTED = "submitted"
LA_UNDER_REVIEW = "under_review"
LA_DOCS_REQUIRED = "documents_required"
LA_VERIFICATION_PENDING = "verification_pending"
LA_APPROVED = "approved"
LA_REJECTED = "rejected"
LA_DISBURSED = "disbursed"
LA_CANCELLED = "cancelled"

# ─── Education loan status constants ──────────────────────────────────────────
EL_APPROVED = "approved"
EL_DISBURSEMENT_PENDING = "disbursement_pending"
EL_DISBURSED = "disbursed"
EL_ACTIVE = "active"
EL_COMPLETED = "completed"
EL_CANCELLED = "cancelled"

# ─── Disbursement status constants ────────────────────────────────────────────
DISB_PENDING = "pending"
DISB_COMPLETED = "completed"
DISB_FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String(120), nullable=False)
    email = Column(String(254), unique=True, nullable=False, index=True)
    # nullable so Google-only users have no password
    hashed_password = Column(String(128), nullable=True)
    # role: student | bank_officer | bank_admin
    role = Column(String(20), nullable=False, default=ROLE_STUDENT)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    # ── Auth provider ──────────────────────────────────────────────────────────
    auth_provider = Column(String(20), nullable=False, default="local")  # local | google
    google_id     = Column(String(128), unique=True, nullable=True, index=True)
    avatar_url    = Column(String(512), nullable=True)

    # ── Email verification ─────────────────────────────────────────────────────
    email_verified            = Column(Boolean, nullable=False, default=False)
    email_verify_token        = Column(String(128), nullable=True, index=True)
    email_verify_token_expiry = Column(DateTime(timezone=True), nullable=True)

    # ── 2FA (TOTP) ─────────────────────────────────────────────────────────────
    totp_secret  = Column(String(256), nullable=True)   # Fernet-encrypted
    totp_enabled = Column(Boolean, nullable=False, default=False)

    # ── Login lockout ──────────────────────────────────────────────────────────
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until          = Column(DateTime(timezone=True), nullable=True)

    # ── Token version — bump to invalidate all issued JWTs ────────────────────
    token_version = Column(Integer, nullable=False, default=0)

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="user", cascade="all, delete-orphan")
    income_sources = relationship("IncomeSource", back_populates="user", cascade="all, delete-orphan")
    affordability_records = relationship("AffordabilityRecord", back_populates="user", cascade="all, delete-orphan")
    ai_conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan", order_by="Notification.created_at.desc()")
    loan_applications = relationship("LoanApplication", back_populates="student", foreign_keys="LoanApplication.student_user_id", cascade="all, delete-orphan")
    reviewed_applications = relationship("LoanApplication", back_populates="reviewer", foreign_keys="LoanApplication.reviewed_by")
    audit_logs = relationship("AuditLog", back_populates="actor", foreign_keys="AuditLog.actor_user_id", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    description = Column(String(500), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String(20), nullable=False)         # income/expense/loan/scholarship/savings
    payment_method = Column(String(20), nullable=False)
    source = Column(String(200), nullable=True)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=True)
    scholarship_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="transactions")
    loan = relationship("Loan", back_populates="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    budget_amount = Column(Float, nullable=False)
    month = Column(String(7), nullable=False, index=True)  # YYYY-MM
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="budgets")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0.0)
    deadline = Column(String(10), nullable=False)  # YYYY-MM-DD
    monthly_contribution = Column(Float, nullable=False, default=0.0)
    status = Column(String(20), nullable=False, default="active")  # active/completed/paused
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="goals")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    principal_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)   # annual %
    tenure_months = Column(Integer, nullable=False)
    loan_start_date = Column(String(10), nullable=False)
    repayment_start_date = Column(String(10), nullable=False)
    status = Column(String(20), nullable=False, default="active")  # active/closed/pending
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="loans")
    transactions = relationship("Transaction", back_populates="loan")


class IncomeSource(Base):
    __tablename__ = "income_sources"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)   # salary/stipend/allowance/freelance/scholarship/other
    label = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    month = Column(String(7), nullable=False, index=True)  # YYYY-MM
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="income_sources")


class AffordabilityRecord(Base):
    __tablename__ = "affordability_records"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    item_name = Column(String(300), nullable=False)
    item_price = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    is_recurring = Column(Boolean, nullable=False, default=False)
    recommendation = Column(String(30), nullable=False)
    available_balance = Column(Float, nullable=False)
    expected_monthly_expenses = Column(Float, nullable=False)
    upcoming_obligations = Column(Float, nullable=False)
    savings_goal_contribution = Column(Float, nullable=False)
    estimated_disposable_amount = Column(Float, nullable=False)
    ai_explanation = Column(Text, nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="affordability_records")


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(300), nullable=False, default="New Conversation")
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    user = relationship("User", back_populates="ai_conversations")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at")


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(String, primary_key=True, default=_uuid)
    conversation_id = Column(String, ForeignKey("ai_conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user/assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    conversation = relationship("AIConversation", back_populates="messages")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(String, primary_key=True, default=_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    # purpose: 'reset' (forgot-password) | 'signup' (email verification)
    purpose    = Column(String(16), nullable=False, default="reset")
    # bcrypt hash of the 6-digit OTP — never store plain OTP
    otp_hash   = Column(String(128), nullable=True)
    # legacy plain column kept nullable so old rows don't break; new rows use otp_hash
    otp_code   = Column(String(6), nullable=True)
    attempts   = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    # earliest time a resend is allowed (signup flow: 60 s cooldown)
    resend_after = Column(DateTime(timezone=True), nullable=True)
    used       = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")


class LoginAuditLog(Base):
    """Immutable login attempt log (success and failure)."""
    __tablename__ = "login_audit_logs"

    id         = Column(String, primary_key=True, default=_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    email      = Column(String(254), nullable=False, index=True)
    success    = Column(Boolean, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class Wallet(Base):
    """
    One wallet per user. Balance is the authoritative virtual balance stored in the DB.
    Never trust balance values from the frontend — all mutations go through the backend.
    """
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)
    currency = Column(String(3), nullable=False, default="INR")
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    user = relationship("User", back_populates="wallet")


class Notification(Base):
    """
    Persistent per-user notifications generated by real backend events
    (transactions, budget alerts, goals, system messages).
    Never hardcoded or faked — every row corresponds to a real event.
    """
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)        # transaction / budget_alert / goal / system
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    user = relationship("User", back_populates="notifications")


# ─────────────────────────────────────────────────────────────────────────────
# Education Loan Application Models
# ─────────────────────────────────────────────────────────────────────────────

class LoanApplication(Base):
    """
    An education-loan application submitted by a student.
    student_user_id is always taken from the server-side auth token — never trusted from frontend.
    """
    __tablename__ = "loan_applications"

    id = Column(String, primary_key=True, default=_uuid)
    # Human-readable unique ID, e.g. EDU-2026-102938
    application_id = Column(String(30), unique=True, nullable=False, index=True)
    student_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Student information
    full_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)
    date_of_birth = Column(String(10), nullable=False)   # YYYY-MM-DD

    # Education information
    institution = Column(String(300), nullable=False)
    course = Column(String(200), nullable=False)
    course_duration_years = Column(Integer, nullable=False)
    current_year_semester = Column(String(50), nullable=False)

    # Loan details
    tuition_fee = Column(Float, nullable=False)
    other_expenses = Column(Float, nullable=False, default=0.0)
    total_education_cost = Column(Float, nullable=False)
    requested_amount = Column(Float, nullable=False)
    repayment_period_months = Column(Integer, nullable=False)

    # Financial information (optional)
    annual_family_income = Column(Float, nullable=True)
    co_applicant_name = Column(String(120), nullable=True)
    co_applicant_relation = Column(String(50), nullable=True)
    co_applicant_income = Column(Float, nullable=True)
    existing_obligations = Column(Float, nullable=True)
    purpose_notes = Column(Text, nullable=True)

    # Status and SLA
    status = Column(String(30), nullable=False, default=LA_SUBMITTED)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)   # submitted_at + 30 min
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    decision_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String, ForeignKey("users.id"), nullable=True)

    # Bank decision
    bank_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    student = relationship("User", back_populates="loan_applications", foreign_keys=[student_user_id])
    reviewer = relationship("User", back_populates="reviewed_applications", foreign_keys=[reviewed_by])
    documents = relationship("LoanDocument", back_populates="application", cascade="all, delete-orphan")
    education_loan = relationship("EducationLoan", back_populates="application", uselist=False)


class LoanDocument(Base):
    """
    A document uploaded for a loan application.
    Files are stored on disk under a non-public path and accessed via a secure endpoint.
    """
    __tablename__ = "loan_documents"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("loan_applications.id"), nullable=False, index=True)
    document_type = Column(String(80), nullable=False)
    original_filename = Column(String(255), nullable=False)
    # secure storage path relative to DOCS_ROOT — never expose to clients
    storage_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="uploaded")  # uploaded/verified/rejected
    uploaded_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String, ForeignKey("users.id"), nullable=True)

    application = relationship("LoanApplication", back_populates="documents")


class EducationLoan(Base):
    """
    The loan record created once a LoanApplication is approved by the bank.
    """
    __tablename__ = "education_loans"

    id = Column(String, primary_key=True, default=_uuid)
    loan_id = Column(String(30), unique=True, nullable=False, index=True)  # e.g. LOAN-2026-XXXXXX
    application_id = Column(String, ForeignKey("loan_applications.id"), nullable=False, unique=True)
    student_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    approved_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False, default=0.0)   # annual %
    tenure_months = Column(Integer, nullable=False)
    repayment_frequency = Column(String(20), nullable=False, default="monthly")

    status = Column(String(30), nullable=False, default=EL_APPROVED)
    approved_by = Column(String, ForeignKey("users.id"), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=False)
    disbursed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    application = relationship("LoanApplication", back_populates="education_loan")
    student = relationship("User", foreign_keys=[student_user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    disbursements = relationship("LoanDisbursement", back_populates="loan")


class LoanDisbursement(Base):
    """
    Tracks the wallet-credit operation for an approved loan.
    Idempotent: unique constraint on loan_id prevents double-disbursement.
    """
    __tablename__ = "loan_disbursements"

    id = Column(String, primary_key=True, default=_uuid)
    disbursement_id = Column(String(40), unique=True, nullable=False, index=True)  # LOAN-DISB-2026-XXXXXX
    loan_id = Column(String, ForeignKey("education_loans.id"), nullable=False)
    student_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    wallet_transaction_id = Column(String, ForeignKey("transactions.id"), nullable=True)
    status = Column(String(20), nullable=False, default=DISB_PENDING)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    # Idempotency: only one disbursement per loan
    __table_args__ = (UniqueConstraint("loan_id", name="uq_disbursement_loan"),)

    loan = relationship("EducationLoan", back_populates="disbursements")
    student = relationship("User", foreign_keys=[student_user_id])
    wallet_transaction = relationship("Transaction", foreign_keys=[wallet_transaction_id])


class AuditLog(Base):
    """
    Immutable audit trail for all important bank/financial actions.
    Rows are INSERT-only — never updated or deleted.
    """
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=_uuid)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    actor_role = Column(String(20), nullable=False)
    entity_type = Column(String(50), nullable=False)   # loan_application / education_loan / disbursement
    entity_id = Column(String, nullable=False, index=True)
    action = Column(String(80), nullable=False)
    metadata_json = Column(Text, nullable=True)          # JSON string of extra info
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    actor = relationship("User", back_populates="audit_logs", foreign_keys=[actor_user_id])
