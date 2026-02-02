"""
SMS Service for sending notifications to users.

Supports multiple SMS providers:
- Africa's Talking (recommended for African countries)
- Twilio (global provider)
- Termii (Nigerian provider)
"""

import os
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# SMS Configuration from environment variables
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "termii")  # africastalking, twilio, termii
SMS_ENABLED = os.getenv("SMS_ENABLED", "true").lower() == "true"  # Enable by default

# Africa's Talking
AT_USERNAME = os.getenv("AT_USERNAME", "sandbox")
AT_API_KEY = os.getenv("AT_API_KEY", "")
AT_SENDER_ID = os.getenv("AT_SENDER_ID", "KADWDC")

# Twilio
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Termii (Default provider for Nigeria)
TERMII_API_KEY = os.getenv("TERMII_API_KEY", "TLZtjvgmVCABGCbQBOggBoOccjRZXhQGDjDMdFqkxKbNOQmTsrETfbLTXfLJjb")
TERMII_SENDER_ID = os.getenv("TERMII_SENDER_ID", "KADWDC")


def send_sms(phone: str, message: str) -> tuple[bool, Optional[str]]:
    """
    Send SMS to a phone number.

    Args:
        phone: Phone number in international format (e.g., +2348012345678)
        message: SMS message content

    Returns:
        tuple: (success: bool, error_message: Optional[str])
    """

    logger.info(f"SMS Send Request - Provider: {SMS_PROVIDER}, Enabled: {SMS_ENABLED}, Phone: {phone}")

    if not SMS_ENABLED:
        logger.warning(f"SMS disabled. Would send to {phone}: {message[:50]}...")
        return False, "SMS is disabled. Set SMS_ENABLED=true in environment variables."

    # Normalize phone number
    try:
        phone = normalize_phone_number(phone)
        logger.info(f"Normalized phone number: {phone}")
    except Exception as e:
        logger.error(f"Phone normalization failed: {str(e)}")
        return False, f"Invalid phone number format: {str(e)}"

    if SMS_PROVIDER == "africastalking":
        return send_sms_africastalking(phone, message)
    elif SMS_PROVIDER == "twilio":
        return send_sms_twilio(phone, message)
    elif SMS_PROVIDER == "termii":
        return send_sms_termii(phone, message)
    else:
        logger.error(f"Unknown SMS provider: {SMS_PROVIDER}")
        return False, f"Unknown SMS provider: {SMS_PROVIDER}"


def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number to international format.

    Args:
        phone: Phone number in various formats

    Returns:
        str: Phone number in international format (+234...)
    """
    # Remove spaces, dashes, parentheses
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    # If starts with 0, replace with +234
    if phone.startswith("0"):
        phone = "+234" + phone[1:]

    # If doesn't start with +, add +234
    if not phone.startswith("+"):
        phone = "+234" + phone

    return phone


def send_sms_africastalking(phone: str, message: str) -> tuple[bool, Optional[str]]:
    """Send SMS using Africa's Talking API."""

    if not AT_API_KEY:
        logger.error("Africa's Talking API key not configured")
        return False, "SMS service not configured"

    try:
        url = "https://api.africastalking.com/version1/messaging"

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "apiKey": AT_API_KEY
        }

        data = {
            "username": AT_USERNAME,
            "to": phone,
            "message": message,
            "from": AT_SENDER_ID
        }

        response = requests.post(url, headers=headers, data=data, timeout=10)
        response.raise_for_status()

        result = response.json()

        # Check if message was sent successfully
        if result.get("SMSMessageData", {}).get("Recipients"):
            recipient = result["SMSMessageData"]["Recipients"][0]
            if recipient.get("statusCode") == 101:  # Success code
                logger.info(f"SMS sent successfully to {phone}")
                return True, None
            else:
                error_msg = recipient.get("status", "Unknown error")
                logger.error(f"SMS failed to {phone}: {error_msg}")
                return False, error_msg
        else:
            logger.error(f"SMS failed to {phone}: No recipients in response")
            return False, "Failed to send SMS"

    except requests.RequestException as e:
        logger.error(f"SMS request failed: {str(e)}")
        return False, f"SMS request failed: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error sending SMS: {str(e)}")
        return False, f"Unexpected error: {str(e)}"


def send_sms_twilio(phone: str, message: str) -> tuple[bool, Optional[str]]:
    """Send SMS using Twilio API."""

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        logger.error("Twilio credentials not configured")
        return False, "SMS service not configured"

    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"

        data = {
            "From": TWILIO_PHONE_NUMBER,
            "To": phone,
            "Body": message
        }

        response = requests.post(
            url,
            data=data,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            timeout=10
        )
        response.raise_for_status()

        result = response.json()

        if result.get("status") in ["queued", "sent", "delivered"]:
            logger.info(f"SMS sent successfully to {phone}")
            return True, None
        else:
            error_msg = result.get("error_message", "Unknown error")
            logger.error(f"SMS failed to {phone}: {error_msg}")
            return False, error_msg

    except requests.RequestException as e:
        logger.error(f"SMS request failed: {str(e)}")
        return False, f"SMS request failed: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error sending SMS: {str(e)}")
        return False, f"Unexpected error: {str(e)}"


def send_sms_termii(phone: str, message: str) -> tuple[bool, Optional[str]]:
    """Send SMS using Termii API (Nigerian provider)."""

    if not TERMII_API_KEY:
        logger.error("Termii API key not configured")
        return False, "SMS service not configured - API key missing"

    try:
        url = "https://v3.api.termii.com/api/sms/send"

        headers = {
            "Content-Type": "application/json"
        }

        data = {
            "to": phone,
            "from": TERMII_SENDER_ID,
            "sms": message,
            "type": "plain",
            "channel": "generic",
            "api_key": TERMII_API_KEY
        }

        logger.info(f"Sending SMS via Termii to {phone}")
        logger.debug(f"Termii request data: {data}")

        response = requests.post(url, headers=headers, json=data, timeout=15)

        logger.info(f"Termii response status: {response.status_code}")
        logger.debug(f"Termii response body: {response.text}")

        # Try to parse JSON response
        try:
            result = response.json()
        except ValueError:
            logger.error(f"Failed to parse Termii response as JSON: {response.text}")
            return False, f"Invalid response from SMS provider: {response.text[:100]}"

        # Check for success - Termii returns message_id on success
        if response.status_code == 200:
            if result.get("message_id") or result.get("smsStatus") == "Message Sent":
                logger.info(f"✅ SMS sent successfully to {phone} via Termii. Message ID: {result.get('message_id')}")
                return True, None
            else:
                error_msg = result.get("message", result.get("error", str(result)))
                logger.error(f"❌ Termii returned 200 but no message_id: {error_msg}")
                return False, f"SMS not sent: {error_msg}"
        else:
            error_msg = result.get("message", result.get("error", response.text))
            logger.error(f"❌ Termii API error ({response.status_code}): {error_msg}")
            return False, f"SMS failed: {error_msg}"

    except requests.Timeout:
        logger.error(f"Termii request timed out for {phone}")
        return False, "SMS request timed out. Please try again."
    except requests.RequestException as e:
        logger.error(f"Termii SMS request failed: {str(e)}")
        return False, f"Network error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error sending SMS via Termii: {str(e)}", exc_info=True)
        return False, f"Unexpected error: {str(e)}"


def send_welcome_sms(phone: str, full_name: str, email: str, password: str, role: str) -> tuple[bool, Optional[str]]:
    """
    Send welcome SMS with login credentials to a new user.

    Args:
        phone: User's phone number
        full_name: User's full name
        email: User's email (username)
        password: Auto-generated password
        role: User's role (LGA_COORDINATOR or WDC_SECRETARY)

    Returns:
        tuple: (success: bool, error_message: Optional[str])
    """

    role_name = "LGA Coordinator" if role == "LGA_COORDINATOR" else "WDC Secretary"

    message = f"""Welcome to Kaduna WDC Platform!

Hello {full_name},

You have been assigned as {role_name}.

Login Details:
Username: {email}
Password: {password}

Login at: https://kadwdc.vercel.app

Please change your password after first login.

- Kaduna State WDC Team"""

    return send_sms(phone, message)
