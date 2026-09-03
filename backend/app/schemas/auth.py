from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

# ── Disposable-email denylist ─────────────────────────────────────────────────
DISPOSABLE_DOMAINS: set[str] = {
    "example.com", "test.com", "mailinator.com", "guerrillamail.com",
    "yopmail.com", "throwam.com", "dispostable.com", "trashmail.com",
    "maildrop.cc", "sharklasers.com", "guerrillamailblock.com",
    "spam4.me", "fakeinbox.com", "tempmail.com", "throwaway.email",
    "getairmail.com", "mailnull.com", "spamgourmet.com", "trashmail.me",
}

_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,}$"
)


def _validate_password_strength(v: str) -> str:
    if not _PASSWORD_RE.match(v):
        raise ValueError(
            "Password must be at least 8 characters and include uppercase, "
            "lowercase, a digit, and a special character"
        )
    return v


def _validate_email_domain(v: str) -> str:
    domain = v.split("@")[-1].lower()
    if domain in DISPOSABLE_DOMAINS:
        raise ValueError("Please use a non-disposable email address")
    return v


# ── Output schemas ────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str = "student"
    createdAt: str
    emailVerified: bool = False
    totpEnabled: bool = False
    avatarUrl: Optional[str] = None
    authProvider: str = "local"

    model_config = {"from_attributes": True}


# ── Request schemas ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: Optional[str] = None


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    captcha_token: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(v) > 120:
            raise ValueError("Name must be at most 120 characters")
        return v

    @field_validator("email")
    @classmethod
    def no_disposable_email(cls, v: str) -> str:
        return _validate_email_domain(v)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class GoogleAuthRequest(BaseModel):
    id_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    captcha_token: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class Enable2FAResponse(BaseModel):
    qr_uri: str
    secret: str  # shown once so user can enter manually into authenticator


class Verify2FARequest(BaseModel):
    totp_code: str


class TwoFactorLoginRequest(BaseModel):
    partial_token: str
    totp_code: str


class VerifyEmailRequest(BaseModel):
    token: str


# ── OTP email verification (signup flow) ──────────────────────────────────────

class VerifySignupOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendSignupOTPRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class Partial2FAResponse(BaseModel):
    requires_2fa: bool
    partial_token: str


class NeedsVerificationResponse(BaseModel):
    """Returned by /auth/login when the account exists but email is not verified."""
    needs_verification: bool = True
    email: str
    dev_otp: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


class DevOTPResponse(BaseModel):
    """
    Only returned when APP_ENV=development.
    Carries the plain OTP so it can be shown in the browser — never used in production.
    """
    message: str
    dev_otp: Optional[str] = None
