"""
Email service — sends branded OTP emails.
Primary: Resend API (resend.com) — reliable, sends to any email.
Fallback: SMTP (Gmail) — used only if RESEND_API_KEY is not set.
"""

from app.config import settings

# ── HTML template ──────────────────────────────────────────────────────────

_OTP_HTML = """<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:24px;padding:40px;
                    box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#06B6D4);
                      border-radius:14px;padding:10px 28px;">
            <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Memora</span>
          </div>
        </td></tr>
        <!-- Title -->
        <tr><td align="center" style="padding-bottom:8px;">
          <h2 style="margin:0;color:#0F172A;font-size:22px;font-weight:900;">{title}</h2>
        </td></tr>
        <!-- Subtitle -->
        <tr><td align="center" style="padding-bottom:28px;">
          <p style="margin:0;color:#64748B;font-size:15px;">{subtitle}</p>
        </td></tr>
        <!-- OTP Box -->
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="background:#EFF6FF;border:2px solid #BFDBFE;border-radius:16px;
                      padding:24px 32px;display:inline-block;">
            <div style="font-size:44px;font-weight:900;letter-spacing:14px;
                        color:#1D4ED8;font-family:monospace;">{code}</div>
            <p style="margin:10px 0 0;color:#93C5FD;font-size:13px;">
              صالح لمدة <strong>{minutes}</strong> دقائق فقط
            </p>
          </div>
        </td></tr>
        <!-- Warning -->
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;color:#94A3B8;font-size:13px;max-width:360px;line-height:1.6;">
            إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد بأمان.
            لا تشارك هذا الرمز مع أي شخص آخر.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center">
          <hr style="border:none;border-top:1px solid #F1F5F9;margin:0 0 16px;">
          <p style="margin:0;color:#CBD5E1;font-size:12px;">
            © 2024 Memora — منصة طبية ذكية للكشف المبكر عن الزهايمر
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_html(code: str, purpose: str) -> tuple[str, str]:
    """Return (subject, html) for the given purpose."""
    if purpose == "verify":
        title    = "تحقق من بريدك الإلكتروني"
        subtitle = "أدخل الرمز أدناه لتأكيد حسابك في منصة Memora"
    else:
        title    = "استعادة كلمة المرور"
        subtitle = "أدخل الرمز أدناه لإعادة تعيين كلمة مرورك"

    html = _OTP_HTML.format(title=title, subtitle=subtitle, code=code, minutes=10)
    return "Memora — رمز التحقق", html


# ── Resend (primary) ───────────────────────────────────────────────────────

def _send_via_resend(to_email: str, code: str, purpose: str) -> None:
    import resend as _resend
    _resend.api_key = settings.RESEND_API_KEY
    subject, html = _build_html(code, purpose)
    _resend.Emails.send({
        "from":    settings.RESEND_FROM,
        "to":      [to_email],
        "subject": subject,
        "html":    html,
    })


# ── SMTP (Gmail / any SMTP server) ────────────────────────────────────────

async def _send_via_smtp(to_email: str, code: str, purpose: str) -> None:
    """Send via smtplib — works with Gmail App Password, no extra packages needed."""
    import smtplib
    import ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    subject, html = _build_html(code, purpose)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Memora <{settings.MAIL_FROM or settings.MAIL_USERNAME}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
        server.ehlo()
        server.starttls(context=ctx)
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(settings.MAIL_USERNAME, to_email, msg.as_string())


# ── Public API ─────────────────────────────────────────────────────────────

async def send_otp_email(to_email: str, code: str, purpose: str) -> None:
    """
    Send OTP email to any address.
    Priority: Gmail SMTP (any recipient) → Resend (requires verified domain for arbitrary recipients).
    Raises on failure.
    """
    if settings.MAIL_USERNAME:
        await _send_via_smtp(to_email, code, purpose)
    elif settings.RESEND_API_KEY:
        _send_via_resend(to_email, code, purpose)
    else:
        raise RuntimeError("لم يتم تهيئة خدمة البريد — أضف MAIL_USERNAME أو RESEND_API_KEY في .env")
