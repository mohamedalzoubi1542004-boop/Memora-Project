"""SMS service — sends OTP via Twilio. Returns False if not configured."""

from app.config import settings


def send_otp_sms(phone: str, code: str, purpose: str) -> bool:
    """
    Send OTP to phone number via Twilio.
    Returns True on success, False if Twilio is not configured or fails.
    """
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_FROM]):
        return False

    try:
        from twilio.rest import Client

        body = (
            f"Memora: رمز التحقق الخاص بك هو {code}. صالح لمدة 10 دقائق. لا تشاركه مع أحد."
            if purpose == "verify"
            else f"Memora: رمز استعادة كلمة المرور هو {code}. صالح لمدة 10 دقائق. لا تشاركه مع أحد."
        )

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=body,
            from_=settings.TWILIO_PHONE_FROM,
            to=phone,
        )
        return True
    except Exception:
        return False
