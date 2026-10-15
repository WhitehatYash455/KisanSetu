import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Production-ready asynchronous email delivery service for KrishiSetu.
    Supports real OTP verification codes via SMTP (Gmail, Outlook, AWS SES, Resend, Custom SMTP).
    """

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER.strip() if settings.SMTP_USER else ""
        self.password = settings.SMTP_PASSWORD.strip() if settings.SMTP_PASSWORD else ""
        self.from_name = settings.SMTP_FROM_NAME or "KrishiSetu | कृषीसेतू"
        self.from_email = settings.SMTP_FROM_EMAIL.strip() if settings.SMTP_FROM_EMAIL else self.user
        self.use_tls = settings.SMTP_USE_TLS

    def is_configured(self) -> bool:
        """Returns True if minimum required SMTP credentials are provided."""
        return bool(self.host and self.user and self.password)

    def _build_otp_html(self, otp_code: str, farmer_name: str, purpose: str) -> str:
        """Generates a professional, mobile-responsive HTML email for OTP delivery."""
        purpose_display = {
            "login": "Farmer Account Sign-In / शेतकरी लॉगिन",
            "forgot_password": "Password Reset / पासवर्ड रीसेट",
            "register": "Farmer Account Verification / शेतकरी नोंदणी",
        }.get(purpose, "Verification / पडताळणी")

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KrishiSetu OTP Verification</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f0;
      margin: 0;
      padding: 24px;
      color: #1c1917;
    }}
    .email-container {{
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      border: 1px solid #e7e5e4;
    }}
    .email-header {{
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .brand-title {{
      font-size: 26px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }}
    .brand-tagline {{
      font-size: 13px;
      margin-top: 6px;
      opacity: 0.9;
    }}
    .email-body {{
      padding: 32px 28px;
    }}
    .greeting {{
      font-size: 17px;
      font-weight: 600;
      color: #292524;
      margin-top: 0;
    }}
    .instruction {{
      font-size: 14px;
      line-height: 1.6;
      color: #57534e;
      margin: 12px 0 24px;
    }}
    .otp-wrapper {{
      background: #f0fdf4;
      border: 2px dashed #86efac;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-label {{
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 8px;
    }}
    .otp-digit {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #047857;
      display: inline-block;
      padding-left: 12px;
    }}
    .security-notice {{
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12.5px;
      color: #991b1b;
      line-height: 1.5;
      margin: 20px 0;
    }}
    .expiry-badge {{
      display: inline-block;
      font-size: 12px;
      color: #065f46;
      background: #d1fae5;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 600;
      margin-top: 8px;
    }}
    .email-footer {{
      background-color: #fafaf9;
      border-top: 1px solid #f5f5f4;
      padding: 20px 24px;
      text-align: center;
      font-size: 11.5px;
      color: #78716c;
      line-height: 1.6;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1 class="brand-title">🌾 KrishiSetu | कृषीसेतू</h1>
      <p class="brand-tagline">Farmer Price Intelligence &amp; Market Advisory</p>
    </div>
    <div class="email-body">
      <p class="greeting">Namaste {farmer_name} Ji (नमस्ते शेतकरी बंधू),</p>
      <p class="instruction">
        Use the following 6-digit One-Time Password (OTP) to complete your <strong>{purpose_display}</strong>:
      </p>

      <div class="otp-wrapper">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-digit">{otp_code}</div>
        <div>
          <span class="expiry-badge">⏱️ Valid for 10 Minutes</span>
        </div>
      </div>

      <div class="security-notice">
        <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. KrishiSetu staff will never ask for your code or passwords over phone or SMS.
      </div>

      <p class="instruction" style="font-size: 12px; margin-bottom: 0;">
        If you did not request this OTP, please ignore this email or contact KrishiSetu support immediately.
      </p>
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 4px;"><strong>KrishiSetu National Portal</strong> &bull; Ministry of Agriculture &amp; Farmer Welfare</p>
      <p style="margin: 0;">This is an automated system email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>"""

    def _send_smtp_sync(self, recipient_email: str, subject: str, html_content: str, text_content: str) -> None:
        """Synchronous SMTP worker intended to run within an executor thread."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = recipient_email

        # Attach plain text and HTML versions
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if self.port == 465:
            # SSL
            with smtplib.SMTP_SSL(self.host, self.port, timeout=12) as server:
                server.login(self.user, self.password)
                server.sendmail(self.from_email, [recipient_email], msg.as_string())
        else:
            # STARTTLS (Port 587 or 25)
            with smtplib.SMTP(self.host, self.port, timeout=12) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, [recipient_email], msg.as_string())

    async def send_otp_email(
        self,
        recipient_email: str,
        otp_code: str,
        farmer_name: str = "Farmer",
        purpose: str = "login"
    ) -> Tuple[bool, str]:
        """
        Sends a real 6-digit OTP code to the recipient's email address via SMTP.
        Returns: (success: bool, status_message: str)
        """
        clean_email = recipient_email.strip()
        if not clean_email or "@" not in clean_email:
            return False, f"Invalid recipient email address: '{recipient_email}'"

        if not self.is_configured():
            msg = (
                f"[SMTP NOT CONFIGURED] Real email OTP could not be sent to {clean_email}. "
                "To enable real email dispatch, set SMTP_USER and SMTP_PASSWORD in backend/.env "
                "(for Gmail, create a free App Password under Google Account -> Security -> App Passwords)."
            )
            logger.warning(msg)
            return False, msg

        subject = f"KrishiSetu Verification Code: {otp_code}"
        html_body = self._build_otp_html(otp_code, farmer_name, purpose)
        text_body = (
            f"Namaste {farmer_name} Ji,\n\n"
            f"Your KrishiSetu verification code is: {otp_code}\n"
            f"This code is valid for 10 minutes.\n\n"
            f"Do not share this OTP with anyone for your security.\n"
            f"- KrishiSetu Team"
        )

        try:
            # Run SMTP delivery in thread pool to prevent blocking asyncio loop
            await asyncio.to_thread(
                self._send_smtp_sync,
                clean_email,
                subject,
                html_body,
                text_body
            )
            logger.info(f"Successfully dispatched real OTP email to {clean_email}")
            return True, f"Real verification code sent successfully to {clean_email}"
        except smtplib.SMTPAuthenticationError as e:
            err = f"SMTP Authentication failed. Verify SMTP_USER and SMTP_PASSWORD: {e}"
            logger.error(err)
            return False, err
        except Exception as e:
            err = f"Failed to deliver real OTP email to {clean_email}: {e}"
            logger.error(err)
            return False, err


# Global singleton instance
email_service = EmailService()
