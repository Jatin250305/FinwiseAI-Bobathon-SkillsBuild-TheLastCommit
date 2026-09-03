"""
SMTP email sender for OTPs, verification links, and security notices.
All sends are best-effort — failures are logged but never crash the request.
In dev (SMTP_USER / SMTP_PASSWORD unset) the OTP is printed to the server log.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, body_html: str, body_text: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — email to %s skipped. Subject: %s", to, subject)
        logger.info("EMAIL CONTENT (dev-only): %s", body_text)
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())
    except Exception:
        logger.exception("Failed to send email to %s", to)


def send_signup_otp_email(to: str, otp: str, name: str) -> None:
    """6-digit OTP sent right after signup to verify the email address."""
    subject = f"Verify your {settings.APP_NAME} account"
    text = (
        f"Hi {name},\n\n"
        f"Your verification code is: {otp}\n\n"
        f"Enter this code on the verification screen to activate your account.\n"
        f"It expires in {settings.PASSWORD_RESET_OTP_TTL_MINUTES} minutes.\n\n"
        f"If you didn't create an account, you can ignore this email.\n\n"
        f"— {settings.APP_NAME} Team"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0F172A;margin-bottom:8px;">Verify your email</h2>
      <p style="color:#475569;margin-bottom:24px;">
        Hi {name}, enter the code below on the verification screen to activate your account.
      </p>
      <div style="background:#F1F5F9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0F172A;">{otp}</span>
      </div>
      <p style="color:#64748B;font-size:13px;">
        This code expires in {settings.PASSWORD_RESET_OTP_TTL_MINUTES} minutes.
        If you didn't sign up for {settings.APP_NAME}, you can safely ignore this email.
      </p>
    </div>
    """
    _send(to, subject, html, text)


def send_otp_email(to: str, otp: str, name: str) -> None:
    """6-digit OTP sent for password reset (forgot-password flow)."""
    subject = f"Your {settings.APP_NAME} password reset code"
    text = (
        f"Hi {name},\n\n"
        f"Your password reset code is: {otp}\n\n"
        f"This code expires in {settings.PASSWORD_RESET_OTP_TTL_MINUTES} minutes.\n"
        f"If you didn't request this, please ignore this email.\n\n"
        f"— {settings.APP_NAME} Team"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0F172A;margin-bottom:8px;">Password Reset</h2>
      <p style="color:#475569;margin-bottom:24px;">Hi {name}, use the code below to reset your password.</p>
      <div style="background:#F1F5F9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0F172A;">{otp}</span>
      </div>
      <p style="color:#64748B;font-size:13px;">
        This code expires in {settings.PASSWORD_RESET_OTP_TTL_MINUTES} minutes.
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    """
    _send(to, subject, html, text)


def send_password_changed_email(to: str, name: str) -> None:
    """Security notice sent after a successful password change."""
    subject = f"Your {settings.APP_NAME} password was changed"
    text = (
        f"Hi {name},\n\n"
        f"Your password was successfully changed. If you did not make this change, "
        f"please contact support immediately.\n\n"
        f"— {settings.APP_NAME} Team"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0F172A;margin-bottom:8px;">Password Changed</h2>
      <p style="color:#475569;">Hi {name}, your password was successfully updated.</p>
      <p style="color:#64748B;font-size:13px;">
        If you didn't make this change, please contact support immediately.
      </p>
    </div>
    """
    _send(to, subject, html, text)


def send_verification_email(to: str, name: str, token: str, base_url: str) -> None:
    """Legacy link-based email verification (kept for backward compatibility)."""
    link = f"{base_url}/verify-email?token={token}"
    subject = f"Verify your {settings.APP_NAME} account"
    text = (
        f"Hi {name},\n\n"
        f"Please verify your email by visiting:\n{link}\n\n"
        f"This link expires in {settings.EMAIL_VERIFY_TOKEN_TTL_HOURS} hours.\n\n"
        f"— {settings.APP_NAME} Team"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0F172A;margin-bottom:8px;">Verify your email</h2>
      <p style="color:#475569;margin-bottom:24px;">Hi {name}, click the button below to verify your account.</p>
      <a href="{link}" style="display:inline-block;background:#0F172A;color:#fff;text-decoration:none;
         padding:12px 28px;border-radius:8px;font-weight:600;margin-bottom:24px;">Verify Email</a>
      <p style="color:#64748B;font-size:13px;">
        Or copy this link: <a href="{link}" style="color:#3b82f6;">{link}</a><br>
        This link expires in {settings.EMAIL_VERIFY_TOKEN_TTL_HOURS} hours.
      </p>
    </div>
    """
    _send(to, subject, html, text)
