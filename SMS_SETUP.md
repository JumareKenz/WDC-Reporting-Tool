# SMS Setup Guide

This guide explains how to configure SMS notifications for sending login credentials to newly assigned users.

## Overview

When a user is assigned as LGA Coordinator or WDC Secretary, the system can automatically send their login credentials via SMS. The system supports three SMS providers:

1. **Africa's Talking** (Recommended for African countries)
2. **Twilio** (Global provider)
3. **Termii** (Nigerian provider)

## Environment Variables

Add these environment variables to your production environment (Render, Railway, etc.):

### Common Settings

```bash
# Enable/Disable SMS (set to "true" to enable)
SMS_ENABLED=true

# SMS Provider (africastalking, twilio, or termii)
SMS_PROVIDER=africastalking
```

### Africa's Talking Configuration

```bash
AT_USERNAME=your_username
AT_API_KEY=your_api_key
AT_SENDER_ID=KADWDC
```

**Setup Steps:**
1. Create account at https://africastalking.com
2. Get API credentials from Dashboard
3. For production: Purchase SMS credits and register sender ID
4. For testing: Use sandbox mode

### Twilio Configuration

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Setup Steps:**
1. Create account at https://twilio.com
2. Get Account SID and Auth Token from Console
3. Purchase a phone number
4. Add credits to your account

### Termii Configuration

```bash
TERMII_API_KEY=your_api_key
TERMII_SENDER_ID=KADWDC
```

**Setup Steps:**
1. Create account at https://termii.com
2. Get API key from Dashboard
3. Register sender ID (approval required)
4. Purchase SMS units

## Testing SMS Locally

To test SMS locally without sending real messages:

```bash
# Leave SMS disabled
SMS_ENABLED=false
```

The system will log what would be sent without actually sending SMS.

To test with real SMS:

1. Set up sandbox credentials (Africa's Talking recommended for testing)
2. Enable SMS: `SMS_ENABLED=true`
3. Test by creating a user assignment

## SMS Message Format

When a user is assigned, they receive:

```
Welcome to Kaduna WDC Platform!

Hello [Full Name],

You have been assigned as [Role].

Login Details:
Username: [email]
Password: [auto-generated password]

Login at: https://kadwdc.vercel.app

Please change your password after first login.

- Kaduna State WDC Team
```

## Phone Number Format

The system accepts phone numbers in various formats and normalizes them:

- `08012345678` → `+2348012345678`
- `+2348012345678` → `+2348012345678`
- `0801 234 5678` → `+2348012345678`

## Deployment Steps

### Render.com

1. Go to your backend service dashboard
2. Click "Environment" tab
3. Add environment variables:
   ```
   SMS_ENABLED=true
   SMS_PROVIDER=africastalking
   AT_USERNAME=your_username
   AT_API_KEY=your_api_key
   AT_SENDER_ID=KADWDC
   ```
4. Click "Save Changes"
5. Service will automatically redeploy

### Railway.app

1. Go to your project dashboard
2. Click on your backend service
3. Go to "Variables" tab
4. Add environment variables (same as above)
5. Service will automatically redeploy

## Troubleshooting

### SMS Not Sending

1. **Check SMS_ENABLED**: Ensure it's set to `"true"` (not `true` or `1`)
2. **Check Credentials**: Verify API keys are correct
3. **Check Phone Format**: Ensure phone number is valid Nigerian format
4. **Check Logs**: Look for SMS-related errors in application logs
5. **Check Provider Dashboard**: Verify account has credits/units

### Common Errors

**"SMS service not configured"**
- API credentials are missing or incorrect
- Check environment variables are set correctly

**"SMS request failed"**
- Network issue or provider is down
- API credentials expired or invalid
- Account has no credits

**"Phone number invalid"**
- Phone number format is incorrect
- Must be Nigerian number starting with +234 or 0

## Cost Estimates

### Africa's Talking (Nigeria)
- ~₦2-4 per SMS
- Minimum purchase: ₦1,000 (~250-500 SMS)

### Twilio (Nigeria)
- ~$0.04 USD per SMS (~₦60)
- Pay as you go, no minimum

### Termii (Nigeria)
- ~₦1.50-3 per SMS
- Minimum purchase varies

## Security Notes

1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate API keys** periodically
4. **Monitor usage** to detect unauthorized access
5. **Set spending limits** on provider dashboards

## Manual Fallback

If SMS fails, the system returns the auto-generated password in the API response so administrators can manually share it with the user.

## Support

For SMS provider support:
- Africa's Talking: support@africastalking.com
- Twilio: https://support.twilio.com
- Termii: support@termii.com
