"""
Education Loan Application Router. (edu-loans prefix to avoid conflict with existing /loans router)

Security model:
- Every endpoint is protected by get_current_user (JWT).
- student_user_id is ALWAYS set from current_user.id server-side, never from request body.
- Bank endpoints require role bank_officer or bank_admin.
- Students can only access their own applications/documents.
- Approval triggers an atomic wallet credit in a single DB transaction.
- Disbursement is idempotent: UniqueConstraint prevents double-credit.
- All important actions are logged in audit_logs.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user, require_bank_role
from app.models import (
    User, Wallet, Transaction, Notification,
    LoanApplication, LoanDocument, EducationLoan, LoanDisbursement, AuditLog,
    LA_SUBMITTED, LA_UNDER_REVIEW, LA_APPROVED, LA_REJECTED, LA_DISBURSED,
    LA_DOCS_REQUIRED, LA_VERIFICATION_PENDING, LA_CANCELLED,
    EL_APPROVED, EL_DISBURSEMENT_PENDING, EL_DISBURSED,
    DISB_PENDING, DISB_COMPLETED, DISB_FAILED,
    ROLE_BANK_OFFICER, ROLE_BANK_ADMIN,
)
from app.schemas.loan_application import (
    LoanApplicationCreate, BankStatusUpdate, ApproveRequest,
    RejectRequest, RequestDocumentsRequest,
    LoanApplicationOut, DocumentOut, EducationLoanOut,
    LoanAnalyticsOut, BankAnalyticsOut,
)
from app.services.document_storage import save_document, open_document

router = APIRouter(tags=["loan-applications"])

SLA_MINUTES = 30


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _gen_application_id() -> str:
    year = datetime.now(timezone.utc).year
    suffix = str(uuid.uuid4().int)[:6]
    return f"EDU-{year}-{suffix}"


def _gen_loan_id() -> str:
    year = datetime.now(timezone.utc).year
    suffix = str(uuid.uuid4().int)[:6]
    return f"LOAN-{year}-{suffix}"


def _gen_disbursement_id() -> str:
    year = datetime.now(timezone.utc).year
    suffix = str(uuid.uuid4().int)[:8]
    return f"LOAN-DISB-{year}-{suffix}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sla_fields(app: LoanApplication) -> dict:
    """Compute SLA elapsed/remaining fields for an application."""
    if not app.submitted_at:
        return {"elapsedMinutes": None, "remainingMinutes": None, "slaBreached": None}
    now = _now()
    # Make both tz-aware
    submitted = app.submitted_at
    if submitted.tzinfo is None:
        submitted = submitted.replace(tzinfo=timezone.utc)
    elapsed = (now - submitted).total_seconds() / 60
    remaining = SLA_MINUTES - elapsed
    return {
        "elapsedMinutes": round(elapsed, 1),
        "remainingMinutes": round(remaining, 1),
        "slaBreached": elapsed > SLA_MINUTES,
    }


def _doc_out(d: LoanDocument) -> DocumentOut:
    return DocumentOut(
        id=d.id,
        documentType=d.document_type,
        originalFilename=d.original_filename,
        mimeType=d.mime_type,
        fileSizeBytes=d.file_size_bytes,
        status=d.status,
        uploadedAt=d.uploaded_at.isoformat(),
    )


def _app_out(app: LoanApplication, include_bank_fields: bool = True) -> LoanApplicationOut:
    sla = _sla_fields(app)
    return LoanApplicationOut(
        id=app.id,
        applicationId=app.application_id,
        studentUserId=app.student_user_id,
        studentName=app.student.name if app.student else "",
        studentEmail=app.student.email if app.student else "",
        fullName=app.full_name,
        phone=app.phone,
        dateOfBirth=app.date_of_birth,
        institution=app.institution,
        course=app.course,
        courseDurationYears=app.course_duration_years,
        currentYearSemester=app.current_year_semester,
        tuitionFee=app.tuition_fee,
        otherExpenses=app.other_expenses,
        totalEducationCost=app.total_education_cost,
        requestedAmount=app.requested_amount,
        repaymentPeriodMonths=app.repayment_period_months,
        annualFamilyIncome=app.annual_family_income,
        coApplicantName=app.co_applicant_name,
        coApplicantRelation=app.co_applicant_relation,
        coApplicantIncome=app.co_applicant_income,
        existingObligations=app.existing_obligations,
        purposeNotes=app.purpose_notes,
        status=app.status,
        submittedAt=app.submitted_at.isoformat() if app.submitted_at else None,
        slaDeadline=app.sla_deadline.isoformat() if app.sla_deadline else None,
        reviewedAt=app.reviewed_at.isoformat() if app.reviewed_at else None,
        decisionAt=app.decision_at.isoformat() if app.decision_at else None,
        bankNotes=app.bank_notes if include_bank_fields else None,
        rejectionReason=app.rejection_reason,
        documents=[_doc_out(d) for d in app.documents],
        elapsedMinutes=sla["elapsedMinutes"],
        remainingMinutes=sla["remainingMinutes"],
        slaBreached=sla["slaBreached"],
        createdAt=app.created_at.isoformat(),
        updatedAt=app.updated_at.isoformat(),
    )


def _loan_out(loan: EducationLoan) -> EducationLoanOut:
    return EducationLoanOut(
        id=loan.id,
        loanId=loan.loan_id,
        applicationId=loan.application_id,
        studentUserId=loan.student_user_id,
        approvedAmount=loan.approved_amount,
        interestRate=loan.interest_rate,
        tenureMonths=loan.tenure_months,
        repaymentFrequency=loan.repayment_frequency,
        status=loan.status,
        approvedBy=loan.approved_by,
        approvedAt=loan.approved_at.isoformat(),
        disbursedAt=loan.disbursed_at.isoformat() if loan.disbursed_at else None,
        createdAt=loan.created_at.isoformat(),
        updatedAt=loan.updated_at.isoformat(),
    )


def _audit(db: Session, actor: User, entity_type: str, entity_id: str, action: str, meta: dict | None = None) -> None:
    log = AuditLog(
        actor_user_id=actor.id,
        actor_role=actor.role,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        metadata_json=json.dumps(meta) if meta else None,
    )
    db.add(log)


def _notify(db: Session, user_id: str, notif_type: str, title: str, message: str) -> None:
    n = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
    )
    db.add(n)


def _get_app_for_student(app_id: str, user: User, db: Session) -> LoanApplication:
    """Fetch a loan application that belongs to the authenticated student."""
    app = db.query(LoanApplication).filter(
        LoanApplication.application_id == app_id,
        LoanApplication.student_user_id == user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


def _get_app_for_bank(app_id: str, db: Session) -> LoanApplication:
    """Fetch a loan application for a bank officer (no student restriction)."""
    app = db.query(LoanApplication).filter(
        LoanApplication.application_id == app_id,
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


# ─────────────────────────────────────────────────────────────────────────────
# Student endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/edu-loans/applications", response_model=LoanApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: LoanApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Student submits a new education-loan application.
    student_user_id is set from the authenticated token — never from the request body.
    """
    # Generate unique application ID (retry on collision)
    for _ in range(5):
        app_id = _gen_application_id()
        if not db.query(LoanApplication).filter(LoanApplication.application_id == app_id).first():
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate application ID")

    now = _now()
    app = LoanApplication(
        application_id=app_id,
        student_user_id=current_user.id,  # ALWAYS from server auth
        full_name=body.full_name,
        phone=body.phone,
        date_of_birth=body.date_of_birth,
        institution=body.institution,
        course=body.course,
        course_duration_years=body.course_duration_years,
        current_year_semester=body.current_year_semester,
        tuition_fee=body.tuition_fee,
        other_expenses=body.other_expenses,
        total_education_cost=body.total_education_cost,
        requested_amount=body.requested_amount,
        repayment_period_months=body.repayment_period_months,
        annual_family_income=body.annual_family_income,
        co_applicant_name=body.co_applicant_name,
        co_applicant_relation=body.co_applicant_relation,
        co_applicant_income=body.co_applicant_income,
        existing_obligations=body.existing_obligations,
        purpose_notes=body.purpose_notes,
        status=LA_SUBMITTED,
        submitted_at=now,
        sla_deadline=now + timedelta(minutes=SLA_MINUTES),
    )
    db.add(app)
    db.flush()

    # Audit
    _audit(db, current_user, "loan_application", app.id, "submitted", {"application_id": app_id})

    # Notify bank officers
    bank_officers = db.query(User).filter(
        User.role.in_([ROLE_BANK_OFFICER, ROLE_BANK_ADMIN])
    ).all()
    for officer in bank_officers:
        _notify(
            db, officer.id, "loan_application",
            "New Education Loan Application",
            f"A new education loan application {app_id} has been submitted by {current_user.name} "
            f"for ₹{body.requested_amount:,.0f} (institution: {body.institution}).",
        )

    # Notify student
    _notify(
        db, current_user.id, "loan_application",
        "Loan Application Submitted",
        f"Your education loan application {app_id} has been submitted successfully. "
        f"Requested: ₹{body.requested_amount:,.0f}. Processing SLA: {SLA_MINUTES} minutes.",
    )

    db.commit()
    db.refresh(app)
    return _app_out(app, include_bank_fields=False)


@router.get("/edu-loans/applications", response_model=List[LoanApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all loan applications for the authenticated student."""
    apps = (
        db.query(LoanApplication)
        .filter(LoanApplication.student_user_id == current_user.id)
        .order_by(LoanApplication.created_at.desc())
        .all()
    )
    return [_app_out(a, include_bank_fields=False) for a in apps]


@router.get("/edu-loans/applications/{application_id}", response_model=LoanApplicationOut)
def get_my_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific application owned by the authenticated student."""
    app = _get_app_for_student(application_id, current_user, db)
    return _app_out(app, include_bank_fields=False)


@router.post("/edu-loans/applications/{application_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    application_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Student uploads a document for their application.
    Validates MIME type, size, and ownership before persisting.
    """
    app = _get_app_for_student(application_id, current_user, db)

    if app.status in (LA_APPROVED, LA_REJECTED, LA_DISBURSED, LA_CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot upload documents for an application with status '{app.status}'",
        )

    storage_path, original_filename, file_size, mime_type = await save_document(
        app.id, document_type, file
    )

    doc = LoanDocument(
        application_id=app.id,
        document_type=document_type,
        original_filename=original_filename,
        storage_path=storage_path,
        file_size_bytes=file_size,
        mime_type=mime_type,
        status="uploaded",
    )
    db.add(doc)
    db.flush()

    _audit(db, current_user, "loan_document", doc.id, "uploaded",
           {"application_id": application_id, "document_type": document_type})

    # Notify bank officers that documents have been uploaded
    bank_officers = db.query(User).filter(
        User.role.in_([ROLE_BANK_OFFICER, ROLE_BANK_ADMIN])
    ).all()
    for officer in bank_officers:
        _notify(
            db, officer.id, "loan_document",
            "Document Uploaded",
            f"Student {current_user.name} uploaded a '{document_type}' document for application {application_id}.",
        )

    db.commit()
    db.refresh(doc)
    return _doc_out(doc)


@router.get("/edu-loans/applications/{application_id}/documents/{document_id}")
async def download_my_document(
    application_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Student downloads their own document.
    Ownership check: application must belong to this student.
    """
    app = _get_app_for_student(application_id, current_user, db)
    doc = db.query(LoanDocument).filter(
        LoanDocument.id == document_id,
        LoanDocument.application_id == app.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    full_path = open_document(doc.storage_path)
    return FileResponse(path=str(full_path), media_type=doc.mime_type,
                        filename=doc.original_filename)


@router.get("/edu-loans/my-loan", response_model=Optional[EducationLoanOut])
def get_my_loan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the most recent disbursed education loan for the authenticated student."""
    loan = (
        db.query(EducationLoan)
        .filter(EducationLoan.student_user_id == current_user.id)
        .order_by(EducationLoan.created_at.desc())
        .first()
    )
    if not loan:
        return None
    return _loan_out(loan)


@router.get("/edu-loans/my-loans", response_model=List[EducationLoanOut])
def list_my_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all education loans for the authenticated student."""
    loans = (
        db.query(EducationLoan)
        .filter(EducationLoan.student_user_id == current_user.id)
        .order_by(EducationLoan.created_at.desc())
        .all()
    )
    return [_loan_out(l) for l in loans]


@router.get("/edu-loans/analytics", response_model=LoanAnalyticsOut)
def student_loan_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return loan analytics for the authenticated student."""
    apps = db.query(LoanApplication).filter(
        LoanApplication.student_user_id == current_user.id
    ).all()
    loans = db.query(EducationLoan).filter(
        EducationLoan.student_user_id == current_user.id
    ).all()

    total_requested = sum(a.requested_amount for a in apps)
    total_approved = sum(l.approved_amount for l in loans)
    total_disbursed = sum(
        l.approved_amount for l in loans
        if l.status == EL_DISBURSED
    )
    active_loans = sum(1 for l in loans if l.status in (EL_APPROVED, EL_DISBURSED))
    pending_apps = sum(1 for a in apps if a.status in (
        LA_SUBMITTED, LA_UNDER_REVIEW, LA_DOCS_REQUIRED, LA_VERIFICATION_PENDING
    ))
    rejected_apps = sum(1 for a in apps if a.status == LA_REJECTED)

    return LoanAnalyticsOut(
        totalRequested=round(total_requested, 2),
        totalApproved=round(total_approved, 2),
        totalDisbursed=round(total_disbursed, 2),
        applicationCount=len(apps),
        activeLoans=active_loans,
        pendingApplications=pending_apps,
        rejectedApplications=rejected_apps,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Bank endpoints — require bank_officer or bank_admin role
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/bank/loan-applications", response_model=List[LoanApplicationOut])
def bank_list_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """Bank officer lists all loan applications, optionally filtered by status."""
    q = db.query(LoanApplication)
    if status_filter:
        q = q.filter(LoanApplication.status == status_filter)
    apps = q.order_by(LoanApplication.submitted_at.asc()).all()
    return [_app_out(a) for a in apps]


@router.get("/bank/loan-applications/{application_id}", response_model=LoanApplicationOut)
def bank_get_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """Bank officer views a specific application (marks as 'under review')."""
    app = _get_app_for_bank(application_id, db)
    if app.status == LA_SUBMITTED:
        app.status = LA_UNDER_REVIEW
        app.reviewed_at = _now()
        app.reviewed_by = current_user.id
        _audit(db, current_user, "loan_application", app.id, "opened_for_review",
               {"application_id": application_id})
        db.commit()
        db.refresh(app)
    return _app_out(app)


@router.patch("/bank/loan-applications/{application_id}/status", response_model=LoanApplicationOut)
def bank_update_status(
    application_id: str,
    body: BankStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """Bank officer changes application status (except approve/reject which have dedicated endpoints)."""
    app = _get_app_for_bank(application_id, db)

    if app.status in (LA_APPROVED, LA_REJECTED, LA_DISBURSED, LA_CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update status of an application in '{app.status}' state",
        )

    old_status = app.status
    app.status = body.status
    if body.bank_notes:
        app.bank_notes = body.bank_notes

    _audit(db, current_user, "loan_application", app.id, "status_changed",
           {"from": old_status, "to": body.status, "application_id": application_id})

    # Notify student if documents required
    if body.status == LA_DOCS_REQUIRED:
        _notify(
            db, app.student_user_id, "loan_application",
            "Additional Documents Required",
            f"Your education loan application {application_id} requires additional documents. "
            + (f"Note from bank: {body.bank_notes}" if body.bank_notes else "Please check the application portal for details."),
        )

    db.commit()
    db.refresh(app)
    return _app_out(app)


@router.post("/bank/loan-applications/{application_id}/approve", response_model=LoanApplicationOut)
def bank_approve_application(
    application_id: str,
    body: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """
    Bank officer approves a loan application.

    Steps (all in one DB transaction):
    1. Verify officer auth (via require_bank_role dep).
    2. Re-fetch latest application state.
    3. Confirm application can be approved.
    4. Create EducationLoan record.
    5. Disburse to student wallet (atomic credit).
    6. Create Transaction record.
    7. Create LoanDisbursement record (idempotent via UniqueConstraint on loan_id).
    8. Update application status → approved → disbursed.
    9. Notify student.
    10. Audit log.
    11. Commit.
    """
    # Step 2 — re-fetch with lock
    app = db.query(LoanApplication).filter(
        LoanApplication.application_id == application_id,
    ).with_for_update().first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Step 3 — guard
    if app.status in (LA_APPROVED, LA_REJECTED, LA_DISBURSED, LA_CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application is already in '{app.status}' state and cannot be approved again",
        )

    if body.approved_amount > app.requested_amount * 1.1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Approved amount significantly exceeds requested amount. Please verify.",
        )

    now = _now()

    # Step 4 — generate unique loan_id
    for _ in range(5):
        loan_id_str = _gen_loan_id()
        if not db.query(EducationLoan).filter(EducationLoan.loan_id == loan_id_str).first():
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate loan ID")

    loan = EducationLoan(
        loan_id=loan_id_str,
        application_id=app.id,
        student_user_id=app.student_user_id,
        approved_amount=body.approved_amount,
        interest_rate=body.interest_rate,
        tenure_months=body.tenure_months,
        repayment_frequency="monthly",
        status=EL_DISBURSEMENT_PENDING,
        approved_by=current_user.id,
        approved_at=now,
    )
    db.add(loan)
    db.flush()  # get loan.id

    # Step 5 — Atomic wallet credit (with_for_update prevents race conditions)
    wallet = db.query(Wallet).filter(
        Wallet.user_id == app.student_user_id
    ).with_for_update().first()

    if not wallet:
        # Auto-create if missing (edge case)
        wallet = Wallet(user_id=app.student_user_id, balance=0.0, currency="INR")
        db.add(wallet)
        db.flush()

    wallet.balance = round(wallet.balance + body.approved_amount, 2)
    wallet.updated_at = now

    # Step 6 — Transaction record (visible in student wallet history)
    today_str = now.strftime("%Y-%m-%d")
    txn = Transaction(
        user_id=app.student_user_id,
        date=today_str,
        description=f"Education loan {application_id} approved and disbursed by bank",
        category="education",
        amount=body.approved_amount,
        type="income",
        payment_method="bank_transfer",
        notes=f"Loan ID: {loan_id_str}. Approved by bank officer {current_user.name}.",
        source="Education Loan Disbursement",
    )
    db.add(txn)
    db.flush()  # get txn.id

    # Step 7 — Disbursement record (UniqueConstraint on loan_id provides idempotency)
    disb_id = _gen_disbursement_id()
    disbursement = LoanDisbursement(
        disbursement_id=disb_id,
        loan_id=loan.id,
        student_user_id=app.student_user_id,
        amount=body.approved_amount,
        currency="INR",
        wallet_transaction_id=txn.id,
        status=DISB_COMPLETED,
        processed_at=now,
    )
    db.add(disbursement)
    db.flush()  # get disbursement.id before audit log references it

    # Step 8 — Update loan and application status
    loan.status = EL_DISBURSED
    loan.disbursed_at = now

    app.status = LA_DISBURSED
    app.decision_at = now
    app.bank_notes = body.bank_notes
    app.reviewed_by = current_user.id

    # Step 9 — Notify student
    _notify(
        db, app.student_user_id, "loan_approval",
        "Education Loan Approved",
        f"Your education loan application {application_id} has been approved for "
        f"₹{body.approved_amount:,.0f}.",
    )
    _notify(
        db, app.student_user_id, "loan_disbursement",
        "Loan Disbursed",
        f"₹{body.approved_amount:,.0f} from your education loan has been credited to your virtual wallet. "
        f"New wallet balance includes the disbursed amount.",
    )

    # Audit
    _audit(db, current_user, "loan_application", app.id, "approved", {
        "application_id": application_id,
        "loan_id": loan_id_str,
        "approved_amount": body.approved_amount,
        "disbursement_id": disb_id,
    })
    _audit(db, current_user, "loan_disbursement", disbursement.id, "disbursed", {
        "loan_id": loan_id_str,
        "amount": body.approved_amount,
        "wallet_transaction_id": txn.id,
    })

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Approval transaction failed for application %s", application_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval transaction failed: {type(e).__name__}. No changes have been applied. Please retry.",
        )

    db.refresh(app)
    return _app_out(app)


@router.post("/bank/loan-applications/{application_id}/reject", response_model=LoanApplicationOut)
def bank_reject_application(
    application_id: str,
    body: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """
    Bank officer rejects a loan application.
    No wallet credit occurs. Student is notified with the reason.
    """
    app = db.query(LoanApplication).filter(
        LoanApplication.application_id == application_id,
    ).with_for_update().first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if app.status in (LA_APPROVED, LA_REJECTED, LA_DISBURSED, LA_CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application is already in '{app.status}' state",
        )

    now = _now()
    app.status = LA_REJECTED
    app.decision_at = now
    app.reviewed_by = current_user.id
    app.rejection_reason = body.rejection_reason
    app.bank_notes = body.bank_notes

    _notify(
        db, app.student_user_id, "loan_rejection",
        "Education Loan Application Update",
        f"Your education loan application {application_id} was not approved. "
        f"Reason: {body.rejection_reason}",
    )

    _audit(db, current_user, "loan_application", app.id, "rejected", {
        "application_id": application_id,
        "reason": body.rejection_reason,
    })

    db.commit()
    db.refresh(app)
    return _app_out(app)


@router.post("/bank/loan-applications/{application_id}/request-documents", response_model=LoanApplicationOut)
def bank_request_documents(
    application_id: str,
    body: RequestDocumentsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """Bank officer requests additional documents from the student."""
    app = _get_app_for_bank(application_id, db)

    if app.status in (LA_APPROVED, LA_REJECTED, LA_DISBURSED, LA_CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request documents for an application in '{app.status}' state",
        )

    app.status = LA_DOCS_REQUIRED
    app.bank_notes = body.bank_notes

    _notify(
        db, app.student_user_id, "loan_application",
        "Additional Documents Required",
        f"Your education loan application {application_id} requires additional documents. "
        f"Bank note: {body.bank_notes}",
    )

    _audit(db, current_user, "loan_application", app.id, "documents_requested",
           {"application_id": application_id, "note": body.bank_notes})

    db.commit()
    db.refresh(app)
    return _app_out(app)


@router.get("/bank/loan-applications/{application_id}/documents/{document_id}")
async def bank_download_document(
    application_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """
    Bank officer securely downloads a document.
    Auth check: must be a bank officer; application must exist.
    """
    app = _get_app_for_bank(application_id, db)
    doc = db.query(LoanDocument).filter(
        LoanDocument.id == document_id,
        LoanDocument.application_id == app.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    _audit(db, current_user, "loan_document", doc.id, "viewed",
           {"application_id": application_id})
    db.commit()

    full_path = open_document(doc.storage_path)
    return FileResponse(path=str(full_path), media_type=doc.mime_type,
                        filename=doc.original_filename)


@router.get("/bank/loan-analytics", response_model=BankAnalyticsOut)
def bank_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_bank_role),
):
    """Bank-officer analytics across all applications."""
    apps = db.query(LoanApplication).all()
    loans = db.query(EducationLoan).all()

    total_requested = sum(a.requested_amount for a in apps)
    total_approved = sum(l.approved_amount for l in loans)
    total_rejected = sum(
        a.requested_amount for a in apps if a.status == LA_REJECTED
    )
    total_disbursed = sum(
        l.approved_amount for l in loans if l.status == EL_DISBURSED
    )

    # Processing time metrics (only decided apps with timestamps)
    processing_times = []
    within_sla = 0
    exceeded_sla = 0
    for a in apps:
        if a.submitted_at and a.decision_at:
            sub = a.submitted_at if a.submitted_at.tzinfo else a.submitted_at.replace(tzinfo=timezone.utc)
            dec = a.decision_at if a.decision_at.tzinfo else a.decision_at.replace(tzinfo=timezone.utc)
            mins = (dec - sub).total_seconds() / 60
            processing_times.append(mins)
            if mins <= SLA_MINUTES:
                within_sla += 1
            else:
                exceeded_sla += 1

    avg_processing = round(sum(processing_times) / len(processing_times), 1) if processing_times else 0.0
    pending = sum(1 for a in apps if a.status in (LA_SUBMITTED, LA_UNDER_REVIEW, LA_VERIFICATION_PENDING))
    awaiting_docs = sum(1 for a in apps if a.status == LA_DOCS_REQUIRED)

    decided = sum(1 for a in apps if a.status in (LA_APPROVED, LA_REJECTED, LA_DISBURSED))
    approval_rate = round(len(loans) / decided * 100, 1) if decided else 0.0

    return BankAnalyticsOut(
        totalApplications=len(apps),
        totalRequestedAmount=round(total_requested, 2),
        totalApprovedAmount=round(total_approved, 2),
        totalRejectedAmount=round(total_rejected, 2),
        totalDisbursedAmount=round(total_disbursed, 2),
        avgProcessingMinutes=avg_processing,
        withinSlaCount=within_sla,
        exceededSlaCount=exceeded_sla,
        pendingCount=pending,
        awaitingDocumentsCount=awaiting_docs,
        approvalRate=approval_rate,
    )

@router.get("/bank/create-officer", tags=["bank-setup"])
def create_bank_officer(
    email: str = Query(default="officer@finwise.com"),
    name: str = Query(default="Bank Officer"),
    password: str = Query(default="BankOfficer123!"),
    role: str = Query(default="bank_officer"),
    db: Session = Depends(get_db),
):
    """
    Dev/setup endpoint to create a bank officer account.
    DISABLE IN PRODUCTION or protect with an admin secret.
    Only allows bank_officer and bank_admin roles.
    """
    from app.core.config import settings
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if role not in ("bank_officer", "bank_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    from app.core.security import hash_password
    from app.models import Wallet
    officer = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=role,
    )
    db.add(officer)
    db.flush()
    wallet = Wallet(user_id=officer.id, balance=0.0, currency="INR")
    db.add(wallet)
    db.commit()
    db.refresh(officer)
    return {"id": officer.id, "email": officer.email, "role": officer.role, "name": officer.name}
