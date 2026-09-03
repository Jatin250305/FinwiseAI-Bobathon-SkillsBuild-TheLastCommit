"""
reCAPTCHA v3 server-side verification.
Returns True if the token is valid and the score meets the threshold.
"""
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_recaptcha(token: str) -> bool:
    """
    Verify a reCAPTCHA v3 token with Google.
    Returns True if valid and score >= RECAPTCHA_MIN_SCORE.
    If RECAPTCHA_SECRET_KEY is not configured, skips verification (dev mode).
    """
    if not settings.RECAPTCHA_SECRET_KEY:
        logger.warning("RECAPTCHA_SECRET_KEY not set — skipping CAPTCHA verification (dev mode)")
        return True
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={"secret": settings.RECAPTCHA_SECRET_KEY, "response": token},
            )
            result = resp.json()
            success = result.get("success", False)
            score = result.get("score", 0.0)
            if not success:
                logger.warning("reCAPTCHA verification failed: %s", result.get("error-codes"))
                return False
            if score < settings.RECAPTCHA_MIN_SCORE:
                logger.warning("reCAPTCHA score too low: %.2f < %.2f", score, settings.RECAPTCHA_MIN_SCORE)
                return False
            return True
    except Exception:
        logger.exception("reCAPTCHA verification error")
        return False
