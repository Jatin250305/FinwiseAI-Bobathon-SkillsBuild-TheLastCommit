"""Add wallets and notifications tables

Revision ID: 0002_wallet_notifications
Revises: 0001_initial
Create Date: 2025-01-01 00:00:00.000000

Additive only — does not modify or drop any existing tables.
Creates a wallet row for every user that exists at migration time (balance=0).
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "0002_wallet_notifications"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # ── wallets ───────────────────────────────────────────────────────────────
    if "wallets" not in existing_tables:
        op.create_table(
            "wallets",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("balance", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        op.create_index("ix_wallets_user_id", "wallets", ["user_id"])

    # ── notifications ─────────────────────────────────────────────────────────
    if "notifications" not in existing_tables:
        op.create_table(
            "notifications",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=300), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("transaction_id", sa.String(), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
        op.create_index("ix_notifications_is_read", "notifications", ["user_id", "is_read"])

    # ── backfill: create a wallet for every existing user that doesn't have one ──
    users = conn.execute(text("SELECT id FROM users")).fetchall()
    import uuid
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    for (user_id,) in users:
        conn.execute(
            text(
                "INSERT INTO wallets (id, user_id, balance, currency, created_at, updated_at) "
                "VALUES (:id, :user_id, 0.0, 'INR', :now, :now)"
            ),
            {"id": str(uuid.uuid4()), "user_id": user_id, "now": now},
        )


def downgrade() -> None:
    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_wallets_user_id", table_name="wallets")
    op.drop_table("wallets")
