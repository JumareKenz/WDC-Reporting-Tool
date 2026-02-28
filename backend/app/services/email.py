"""
Email service for sending notifications.

Supports SMTP email sending for password resets and other notifications.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Email Configuration
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "true").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "Kaduna WDC Platform")


def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Send an email.

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body (optional, falls back to HTML)

    Returns:
        tuple: (success: bool, error_message: Optional[str])
    """

    if not EMAIL_ENABLED:
        logger.warning(f"Email disabled. Would send to {to_email}: {subject}")
        return False, "Email is disabled. Set EMAIL_ENABLED=true in environment variables."

    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP credentials not configured")
        return False, "Email service not configured"

    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = to_email

        # Add text and HTML parts
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)

        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)

        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"✅ Email sent successfully to {to_email}")
        return True, None

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {str(e)}")
        return False, "Email authentication failed. Check SMTP credentials."
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {str(e)}")
        return False, f"Email sending failed: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}", exc_info=True)
        return False, f"Unexpected error: {str(e)}"


def send_password_reset_email(email: str, reset_token: str, full_name: str) -> Tuple[bool, Optional[str]]:
    """
    Send password reset email with reset link.

    Args:
        email: User's email address
        reset_token: Password reset token
        full_name: User's full name

    Returns:
        tuple: (success: bool, error_message: Optional[str])
    """

    reset_url = f"https://kadwdc.vercel.app/reset-password?token={reset_token}"

    subject = "Reset Your Password - Kaduna WDC Platform"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello {full_name},</p>

                <p>We received a request to reset your password for your Kaduna WDC Platform account.</p>

                <p>Click the button below to reset your password:</p>

                <div style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </div>

                <p>Or copy and paste this link into your browser:</p>
                <p style="background: white; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; word-break: break-all; font-size: 12px;">
                    {reset_url}
                </p>

                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                    </ul>
                </div>

                <p>If you need assistance, contact support at support@kaduna.gov.ng</p>

                <p>Best regards,<br>
                Kaduna WDC Platform Team</p>
            </div>
            <div class="footer">
                <p>© 2026 Kaduna State WDC Platform. All rights reserved.</p>
                <p>Kaduna State, Nigeria</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Password Reset Request

    Hello {full_name},

    We received a request to reset your password for your Kaduna WDC Platform account.

    Click the link below to reset your password:
    {reset_url}

    Security Notice:
    - This link will expire in 1 hour
    - If you didn't request this reset, please ignore this email
    - Never share this link with anyone

    If you need assistance, contact support at support@kaduna.gov.ng

    Best regards,
    Kaduna WDC Platform Team
    """

    return send_email(email, subject, html_body, text_body)
