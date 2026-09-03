"""Add education loan tables and role column to users

Revision ID: 0003_education_loans
Revises: 0002_wallet_notifications
Create Date: 2025-01-02 00:00:00.000000

Additive only — creates new tables and adds `role` column to existing users.
Existing users get role='student' by default.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "0003_education_loans"
down_revision: Union[str, None] = "0002_wallet_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    existing_cols_users = [c["name"] for c in inspector.get_columns("users")]

    # ── Add role column to users (idempotent) ─────────────────────────────────
    if "role" not in existing_cols_users:
        op.add_column("users", sa.Column("role", sa.String(20), nullable=False, server_default="student"))
        # Backfill any existing rows
        conn.execute(text("UPDATE users SET role = 'student' WHERE role IS NULL OR role = ''"))

    # ── loan_applications ─────────────────────────────────────────────────────
    if "loan_applications" not in existing_tables:
        op.create_table(
            "loan_applications",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("application_id", sa.String(length=30), nullable=False),
            sa.Column("student_user_id", sa.String(), nullable=False),
            sa.Column("full_name", sa.String(length=120), nullable=False),
            sa.Column("phone", sa.String(length=20), nullable=False),
            sa.Column("date_of_birth", sa.String(length=10), nullable=False),
            sa.Column("institution", sa.String(length=300), nullable=False),
            sa.Column("course", sa.String(length=200), nullable=False),
            sa.Column("course_duration_years", sa.Integer(), nullable=False),
            sa.Column("current_year_semester", sa.String(length=50), nullable=False),
            sa.Column("tuition_fee", sa.Float(), nullable=False),
            sa.Column("other_expenses", sa.Float(), nullable=False, server_default="0"),
            sa.Column("total_education_cost", sa.Float(), nullable=False),
            sa.Column("requested_amount", sa.Float(), nullable=False),
            sa.Column("repayment_period_months", sa.Integer(), nullable=False),
            sa.Column("annual_family_income", sa.Float(), nullable=True),
            sa.Column("co_applicant_name", sa.String(length=120), nullable=True),
            sa.Column("co_applicant_relation", sa.String(length=50), nullable=True),
            sa.Column("co_applicant_income", sa.Float(), nullable=True),
            sa.Column("existing_obligations", sa.Float(), nullable=True),
            sa.Column("purpose_notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="submitted"),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("decision_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reviewed_by", sa.String(), nullable=True),
            sa.Column("bank_notes", sa.Text(), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["student_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("application_id"),
        )
        op.create_index("ix_loan_applications_student_user_id", "loan_applications", ["student_user_id"])
        op.create_index("ix_loan_applications_application_id", "loan_applications", ["application_id"])

    # ── loan_documents ────────────────────────────────────────────────────────
    if "loan_documents" not in existing_tables:
        op.create_table(
            "loan_documents",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("application_id", sa.String(), nullable=False),
            sa.Column("document_type", sa.String(length=80), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("storage_path", sa.String(length=500), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="uploaded"),
            sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("verified_by", sa.String(), nullable=True),
            sa.ForeignKeyConstraint(["application_id"], ["loan_applications.id"]),
            sa.ForeignKeyConstraint(["verified_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_loan_documents_application_id", "loan_documents", ["application_id"])

    # ── education_loans ───────────────────────────────────────────────────────
    if "education_loans" not in existing_tables:
        op.create_table(
            "education_loans",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("loan_id", sa.String(length=30), nullable=False),
            sa.Column("application_id", sa.String(), nullable=False),
            sa.Column("student_user_id", sa.String(), nullable=False),
            sa.Column("approved_amount", sa.Float(), nullable=False),
            sa.Column("interest_rate", sa.Float(), nullable=False, server_default="0"),
            sa.Column("tenure_months", sa.Integer(), nullable=False),
            sa.Column("repayment_frequency", sa.String(length=20), nullable=False, server_default="monthly"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="approved"),
            sa.Column("approved_by", sa.String(), nullable=False),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("disbursed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["application_id"], ["loan_applications.id"]),
            sa.ForeignKeyConstraint(["student_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("loan_id"),
            sa.UniqueConstraint("application_id"),
        )
        op.create_index("ix_education_loans_student_user_id", "education_loans", ["student_user_id"])
        op.create_index("ix_education_loans_loan_id", "education_loans", ["loan_id"])

    # ── loan_disbursements ────────────────────────────────────────────────────
    if "loan_disbursements" not in existing_tables:
        op.create_table(
            "loan_disbursements",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("disbursement_id", sa.String(length=40), nullable=False),
            sa.Column("loan_id", sa.String(), nullable=False),
            sa.Column("student_user_id", sa.String(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
            sa.Column("wallet_transaction_id", sa.String(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["loan_id"], ["education_loans.id"]),
            sa.ForeignKeyConstraint(["student_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["wallet_transaction_id"], ["transactions.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("disbursement_id"),
            sa.UniqueConstraint("loan_id", name="uq_disbursement_loan"),
        )
        op.create_index("ix_loan_disbursements_student_user_id", "loan_disbursements", ["student_user_id"])

    # ── audit_logs ────────────────────────────────────────────────────────────
    if "audit_logs" not in existing_tables:
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("actor_user_id", sa.String(), nullable=False),
            sa.Column("actor_role", sa.String(length=20), nullable=False),
            sa.Column("entity_type", sa.String(length=50), nullable=False),
            sa.Column("entity_id", sa.String(), nullable=False),
            sa.Column("action", sa.String(length=80), nullable=False),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])
        op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("loan_disbursements")
    op.drop_table("education_loans")
    op.drop_table("loan_documents")
    op.drop_table("loan_applications")
    # Note: dropping role column from users is omitted for safety
