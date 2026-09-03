import logging
import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Union

import httpx
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_partial_token, decode_partial_token,
    generate_totp_secret, verify_totp, get_totp_provisioning_uri,
    encrypt_totp_secret, decrypt_totp_secret,
    generate_otp, hash_otp, verify_otp_hash,
)
from app.core.config import settings
from app.models import User, PasswordResetToken, Wallet, Notification, LoginAuditLog
from app.schemas.auth import (
    LoginRequest, RegisterRequest, ForgotPasswordRequest,
    GoogleAuthRequest, VerifyOTPRequest, ResetPasswordRequest,
    Enable2FAResponse, Verify2FARequest, TwoFactorLoginRequest,
    VerifyEmailRequest,
    VerifySignupOTPRequest, ResendSignupOTPRequest,
    AuthResponse, Partial2FAResponse, NeedsVerificationResponse,
    UserOut, MessageResponse, DevOTPResponse,
)
from app.deps import get_current_user
from app.services.email import (
    send_otp_email, send_signup_otp_email,
    send_password_changed_email,
)
from app.services.captcha import verify_recaptcha
from app.core.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

GENERIC_CRED_ERROR = "Invalid email or password."
GENERIC_SERVER_ERROR = "Something went wrong. Please try again."
OTP_INVALID_ERROR   = "Invalid or expired code."

# Resend cooldown for signup OTP
RESEND_COOLDOWN_SECONDS = 60


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        createdAt=user.created_at.isoformat(),
        emailVerified=user.email_verified,
        totpEnabled=user.totp_enabled,
        avatarUrl=user.avatar_url,
        authProvider=user.auth_provider,
    )


def _record_login(db: Session, user: User | None, email: str, success: bool, request: Request) -> None:
    try:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent", "")[:512]
        log = LoginAuditLog(
            user_id=user.id if user else None,
            email=email,
            success=success,
            ip_address=ip,
            user_agent=ua,
        )
        db.add(log)
        db.commit()
    except Exception:
        logger.exception("Failed to write login audit log")


def _check_lockout(user: User) -> None:
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        mins = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {mins} minute(s).",
        )


def _handle_failed_login(user: User, db: Session) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOCKOUT_MINUTES)
        logger.warning("Account locked: %s after %d failed attempts", user.email, user.failed_login_attempts)
    db.commit()


def _reset_failed_login(user: User, db: Session) -> None:
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()


async def _check_captcha(token: str | None, label: str = "request") -> None:
    if not await verify_recaptcha(token or ""):
        logger.warning("CAPTCHA verification failed for %s", label)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA verification failed. Please try again.",
        )


def _invalidate_otp_tokens(db: Session, user_id: str, purpose: str) -> None:
    """Mark all unused tokens for a user+purpose as used."""
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.purpose == purpose,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({"used": True})
    db.commit()


def _create_otp_token(
    db: Session,
    user_id: str,
    purpose: str,
    ttl_minutes: int,
    resend_cooldown_seconds: int = 0,
) -> str:
    """Generate, hash, persist and return a plain OTP."""
    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
    resend_after = (
        datetime.now(timezone.utc) + timedelta(seconds=resend_cooldown_seconds)
        if resend_cooldown_seconds > 0 else None
    )
    token = PasswordResetToken(
        user_id=user_id,
        purpose=purpose,
        otp_hash=hash_otp(otp),
        otp_code=otp,           # satisfy legacy NOT NULL column in existing DBs
        expires_at=expires,
        resend_after=resend_after,
    )
    db.add(token)
    db.commit()
    return otp


def _verify_otp_token(
    db: Session,
    user_id: str,
    otp: str,
    purpose: str,
) -> PasswordResetToken:
    """
    Find the latest active token for user+purpose, verify the OTP, increment
    attempts on failure, raise HTTPException on any error.
    Returns the verified (but not yet consumed) token on success.
    """
    token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.purpose == purpose,
            PasswordResetToken.used == False,  # noqa: E712
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )

    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=OTP_INVALID_ERROR)

    if token.attempts >= settings.OTP_MAX_ATTEMPTS:
        token.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please request a new code.",
        )

    # Support both hashed (new) and plain (legacy reset flow) OTPs
    if token.otp_hash:
        valid = verify_otp_hash(otp, token.otp_hash)
    else:
        valid = (token.otp_code == otp)

    if not valid:
        token.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=OTP_INVALID_ERROR)

    return token


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=DevOTPResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    await _check_captcha(body.captcha_token, body.email)

    existing = db.query(User).filter(User.email == body.email).first()

    # If already registered but unverified — resend OTP, don't reveal the account exists
    if existing:
        dev_otp = None
        if not existing.email_verified:
            dev_otp = _issue_signup_otp(db, existing)
        return DevOTPResponse(
            message="If this email is not already registered, a verification code has been sent.",
            dev_otp=dev_otp if settings.APP_ENV == "development" else None,
        )

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        email_verified=False,
    )
    db.add(user)
    db.flush()

    wallet = Wallet(user_id=user.id, balance=0.0, currency="INR")
    db.add(wallet)
    welcome = Notification(
        user_id=user.id,
        type="system",
        title="Welcome to FinWise AI",
        message=(
            f"Hi {user.name}! Your account is set up. "
            "Start by adding your income sources and tracking your transactions."
        ),
    )
    db.add(welcome)
    db.commit()
    db.refresh(user)

    otp = _issue_signup_otp(db, user)

    return DevOTPResponse(
        message="If this email is not already registered, a verification code has been sent.",
        dev_otp=otp if settings.APP_ENV == "development" else None,
    )


def _issue_signup_otp(db: Session, user: User) -> str:
    """Invalidate existing signup OTPs, create a new one, email it, and return the plain OTP."""
    _invalidate_otp_tokens(db, user.id, purpose="signup")
    otp = _create_otp_token(
        db, user.id, purpose="signup",
        ttl_minutes=settings.PASSWORD_RESET_OTP_TTL_MINUTES,
        resend_cooldown_seconds=RESEND_COOLDOWN_SECONDS,
    )
    send_signup_otp_email(user.email, otp, user.name)
    return otp


# ── Verify signup OTP ─────────────────────────────────────────────────────────

@router.post("/verify-signup-otp", response_model=AuthResponse)
@limiter.limit("10/minute")
def verify_signup_otp(request: Request, body: VerifySignupOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=OTP_INVALID_ERROR)

    if user.email_verified:
        # Already verified — just log them in
        token = create_access_token(user.id, token_version=user.token_version)
        return AuthResponse(token=token, user=_user_out(user))

    otp_token = _verify_otp_token(db, user.id, body.otp, purpose="signup")

    # Activate account
    user.email_verified = True
    otp_token.used = True
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, token_version=user.token_version)
    return AuthResponse(token=token, user=_user_out(user))


# ── Resend signup OTP ─────────────────────────────────────────────────────────

@router.post("/resend-signup-otp", response_model=DevOTPResponse)
@limiter.limit("5/minute")
def resend_signup_otp(request: Request, body: ResendSignupOTPRequest, db: Session = Depends(get_db)):
    """
    Rate-limited resend (60 s cooldown enforced server-side).
    Always returns the same generic message — no email enumeration.
    """
    GENERIC_MSG = "If that email is pending verification, a new code has been sent."

    user = db.query(User).filter(User.email == body.email).first()
    if not user or user.email_verified:
        return DevOTPResponse(message=GENERIC_MSG)

    # Check cooldown: find the most recent active signup token
    latest = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.purpose == "signup",
            PasswordResetToken.used == False,  # noqa: E712
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )

    if latest and latest.resend_after and latest.resend_after > datetime.now(timezone.utc):
        wait = int((latest.resend_after - datetime.now(timezone.utc)).total_seconds()) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait} second(s) before requesting a new code.",
        )

    otp = _issue_signup_otp(db, user)
    return DevOTPResponse(
        message=GENERIC_MSG,
        dev_otp=otp if settings.APP_ENV == "development" else None,
    )


# ── Verify email (legacy token link — keep for backward compat) ───────────────

@router.post("/verify-email", response_model=AuthResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email_verify_token == body.token,
        User.email_verified == False,  # noqa: E712
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link.",
        )
    if user.email_verify_token_expiry and user.email_verify_token_expiry < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Please register again.",
        )

    user.email_verified = True
    user.email_verify_token = None
    user.email_verify_token_expiry = None
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, token_version=user.token_version)
    return AuthResponse(token=token, user=_user_out(user))


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Union[AuthResponse, Partial2FAResponse, NeedsVerificationResponse])
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    await _check_captcha(body.captcha_token, body.email)

    user = db.query(User).filter(User.email == body.email).first()

    if not user:
        _record_login(db, None, body.email, False, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_CRED_ERROR)

    _check_lockout(user)

    # Google-only accounts have no password
    if user.auth_provider == "google" and not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in. Please continue with Google.",
        )

    if not verify_password(body.password, user.hashed_password or ""):
        _handle_failed_login(user, db)
        _record_login(db, user, body.email, False, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_CRED_ERROR)

    _reset_failed_login(user, db)

    # Block login for unverified accounts — resend a fresh OTP
    if not user.email_verified:
        _record_login(db, user, body.email, False, request)
        # Only resend if no active token exists (avoid spam on repeated login attempts)
        active_token = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.purpose == "signup",
                PasswordResetToken.used == False,  # noqa: E712
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )
        otp = _issue_signup_otp(db, user) if not active_token else None
        return NeedsVerificationResponse(
            needs_verification=True,
            email=user.email,
            dev_otp=otp if settings.APP_ENV == "development" else None,
        )

    _record_login(db, user, body.email, True, request)

    # 2FA gate
    if user.totp_enabled:
        partial = create_partial_token(user.id)
        return Partial2FAResponse(requires_2fa=True, partial_token=partial)

    token = create_access_token(user.id, token_version=user.token_version)
    return AuthResponse(token=token, user=_user_out(user))


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.post("/google", response_model=Union[AuthResponse, Partial2FAResponse])
@limiter.limit("10/minute")
async def google_auth(request: Request, body: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Verify Google id_token, create or link user, return JWT."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": body.id_token},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token.")
        info = resp.json()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Google token verification error")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google sign-in failed. Please try again.",
        )

    if settings.GOOGLE_CLIENT_ID and info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token.")

    google_id: str = info.get("sub", "")
    email: str = info.get("email", "")
    name: str = info.get("name", email.split("@")[0])
    avatar: str = info.get("picture", "")
    email_verified_google: bool = info.get("email_verified") in (True, "true")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve account info from Google.",
        )

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        existing_by_email = db.query(User).filter(User.email == email).first()
        if existing_by_email:
            if existing_by_email.auth_provider == "local":
                existing_by_email.google_id = google_id
                existing_by_email.email_verified = True
                if not existing_by_email.avatar_url:
                    existing_by_email.avatar_url = avatar
                db.commit()
                user = existing_by_email
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists.",
                )
        else:
            user = User(
                name=name,
                email=email,
                hashed_password=None,
                auth_provider="google",
                google_id=google_id,
                avatar_url=avatar,
                email_verified=email_verified_google,
            )
            db.add(user)
            db.flush()
            wallet = Wallet(user_id=user.id, balance=0.0, currency="INR")
            db.add(wallet)
            welcome = Notification(
                user_id=user.id, type="system",
                title="Welcome to FinWise AI",
                message=f"Hi {user.name}! Your account is set up via Google.",
            )
            db.add(welcome)
            db.commit()
            db.refresh(user)

    _record_login(db, user, email, True, request)

    if user.totp_enabled:
        partial = create_partial_token(user.id)
        return Partial2FAResponse(requires_2fa=True, partial_token=partial)

    token = create_access_token(user.id, token_version=user.token_version)
    return AuthResponse(token=token, user=_user_out(user))


# ── 2FA: exchange partial token ───────────────────────────────────────────────

@router.post("/2fa/verify", response_model=AuthResponse)
@limiter.limit("10/minute")
def verify_2fa_login(request: Request, body: TwoFactorLoginRequest, db: Session = Depends(get_db)):
    user_id = decode_partial_token(body.partial_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_CRED_ERROR)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_CRED_ERROR)

    try:
        plain_secret = decrypt_totp_secret(user.totp_secret)
    except ValueError:
        logger.error("TOTP secret decryption failed for user %s", user.id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_SERVER_ERROR)

    if not verify_totp(plain_secret, body.totp_code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authenticator code.")

    token = create_access_token(user.id, token_version=user.token_version)
    return AuthResponse(token=token, user=_user_out(user))


# ── 2FA: enable ───────────────────────────────────────────────────────────────

@router.post("/2fa/enable", response_model=Enable2FAResponse)
def enable_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="2FA is already enabled.")

    plain_secret = generate_totp_secret()
    provisioning_uri = get_totp_provisioning_uri(plain_secret, current_user.email)

    qr = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_data_uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

    current_user.totp_secret = encrypt_totp_secret(plain_secret)
    db.commit()

    return Enable2FAResponse(qr_uri=qr_data_uri, secret=plain_secret)


# ── 2FA: confirm ──────────────────────────────────────────────────────────────

@router.post("/2fa/confirm", response_model=MessageResponse)
def confirm_2fa(body: Verify2FARequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="2FA is already enabled.")
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start 2FA setup first via /auth/2fa/enable.",
        )

    try:
        plain_secret = decrypt_totp_secret(current_user.totp_secret)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_SERVER_ERROR)

    if not verify_totp(plain_secret, body.totp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code. Please try again.")

    current_user.totp_enabled = True
    db.commit()
    return MessageResponse(message="Two-factor authentication is now enabled.")


# ── 2FA: disable ──────────────────────────────────────────────────────────────

@router.delete("/2fa/disable", response_model=MessageResponse)
def disable_2fa(body: Verify2FARequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled.")

    try:
        plain_secret = decrypt_totp_secret(current_user.totp_secret)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_SERVER_ERROR)

    if not verify_totp(plain_secret, body.totp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code.")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    return MessageResponse(message="Two-factor authentication has been disabled.")


# ── Forgot password (OTP) ─────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=DevOTPResponse)
@limiter.limit("5/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    await _check_captcha(body.captcha_token, body.email)

    GENERIC_MSG = "If that email is registered, a reset code has been sent."

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return DevOTPResponse(message=GENERIC_MSG)

    _invalidate_otp_tokens(db, user.id, purpose="reset")
    otp = _create_otp_token(
        db, user.id, purpose="reset",
        ttl_minutes=settings.PASSWORD_RESET_OTP_TTL_MINUTES,
    )
    send_otp_email(user.email, otp, user.name)
    return DevOTPResponse(
        message=GENERIC_MSG,
        dev_otp=otp if settings.APP_ENV == "development" else None,
    )


# ── Verify OTP (step 2 of forgot-password flow) ───────────────────────────────

@router.post("/verify-otp", response_model=MessageResponse)
@limiter.limit("10/minute")
def verify_otp(request: Request, body: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=OTP_INVALID_ERROR)

    _verify_otp_token(db, user.id, body.otp, purpose="reset")
    # Don't consume the token yet — it's consumed in /reset-password
    return MessageResponse(message="Code verified. You may now set a new password.")


# ── Reset password (step 3 of forgot-password flow) ──────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=OTP_INVALID_ERROR)

    otp_token = _verify_otp_token(db, user.id, body.otp, purpose="reset")

    user.hashed_password = hash_password(body.new_password)
    user.token_version = (user.token_version or 0) + 1
    otp_token.used = True
    db.commit()

    send_password_changed_email(user.email, user.name)
    return MessageResponse(message="Password updated successfully. Please sign in with your new password.")


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(_: User = Depends(get_current_user)):
    return MessageResponse(message="Logged out successfully")


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)
