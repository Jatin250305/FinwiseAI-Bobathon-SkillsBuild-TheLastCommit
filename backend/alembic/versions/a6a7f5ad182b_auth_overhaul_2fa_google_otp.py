"""auth_overhaul_2fa_google_otp

Revision ID: a6a7f5ad182b
Revises: 0003_education_loans
Create Date: 2026-08-30 11:53:17.253005

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6a7f5ad182b'
down_revision: Union[str, None] = '0003_education_loans'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── login_audit_logs table ────────────────────────────────────────────────
    op.create_table(
        'login_audit_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_login_audit_logs_email'), 'login_audit_logs', ['email'], unique=False)
    op.create_index(op.f('ix_login_audit_logs_user_id'), 'login_audit_logs', ['user_id'], unique=False)

    # ── password_reset_tokens: drop token, add otp + purpose columns ──────────
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.add_column(sa.Column('purpose', sa.String(length=16), nullable=False, server_default='reset'))
        batch_op.add_column(sa.Column('otp_code', sa.String(length=6), nullable=False, server_default='000000'))
        batch_op.add_column(sa.Column('otp_hash', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('resend_after', sa.DateTime(timezone=True), nullable=True))
        batch_op.drop_index('ix_password_reset_tokens_token')
        batch_op.drop_column('token')
        batch_op.create_index(batch_op.f('ix_password_reset_tokens_user_id'), ['user_id'], unique=False)

    # ── users: add auth hardening fields ──────────────────────────────────────
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=20), nullable=False, server_default='local'))
        batch_op.add_column(sa.Column('google_id', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('avatar_url', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('email_verify_token', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('email_verify_token_expiry', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('totp_secret', sa.String(length=256), nullable=True))
        batch_op.add_column(sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))
        batch_op.alter_column('hashed_password', existing_type=sa.VARCHAR(length=128), nullable=True)
        batch_op.create_index(batch_op.f('ix_users_email_verify_token'), ['email_verify_token'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_google_id'), ['google_id'], unique=True)

    # Grandfather existing users — they pre-date email verification, mark all as verified
    op.execute("UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE")


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_google_id'))
        batch_op.drop_index(batch_op.f('ix_users_email_verify_token'))
        batch_op.alter_column('hashed_password', existing_type=sa.VARCHAR(length=128), nullable=False)
        batch_op.drop_column('token_version')
        batch_op.drop_column('locked_until')
        batch_op.drop_column('failed_login_attempts')
        batch_op.drop_column('totp_enabled')
        batch_op.drop_column('totp_secret')
        batch_op.drop_column('email_verify_token_expiry')
        batch_op.drop_column('email_verify_token')
        batch_op.drop_column('email_verified')
        batch_op.drop_column('avatar_url')
        batch_op.drop_column('google_id')
        batch_op.drop_column('auth_provider')

    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.add_column(sa.Column('token', sa.VARCHAR(length=128), nullable=False, server_default=''))
        batch_op.drop_index(batch_op.f('ix_password_reset_tokens_user_id'))
        batch_op.drop_column('attempts')
        batch_op.drop_column('otp_code')
        batch_op.create_index('ix_password_reset_tokens_token', ['token'], unique=True)

    op.drop_index(op.f('ix_login_audit_logs_user_id'), table_name='login_audit_logs')
    op.drop_index(op.f('ix_login_audit_logs_email'), table_name='login_audit_logs')
    op.drop_table('login_audit_logs')
