# Brevo SMTP Configuration Guide

This guide details how to configure **Brevo** for transactional emails in the Namaste Indian Restaurant application.

## Required Environment Variables

Add the following variables to `.env.local` (local development) and your Vercel project configuration (production):

```env
# Set to 'true' to enable sending emails, or 'false' to log them as 'skipped'
EMAIL_ENABLED=true

# Secure key for HMAC-SHA256 token hashing
EMAIL_ACTION_TOKEN_SECRET=your-secure-pepper-signing-key

# Admin notification email
ADMIN_NOTIFICATION_EMAIL=admin-orders@namaste.com

# Brevo SMTP details
BREVO_API_KEY=xkeysib-your-long-brevo-v3-api-key
BREVO_SENDER_EMAIL=hello@namaste-ciechanow.pl
BREVO_SENDER_NAME="Namaste Indian Restaurant"
```

## Setup Instructions

1. **Create a Brevo Account**: Go to [Brevo.com](https://www.brevo.com/) and register.
2. **Retrieve API Key**:
   - In the Brevo dashboard, navigate to **SMTP & API** under your profile menu.
   - Click **Create a new API key**.
   - Copy the key and assign it to `BREVO_API_KEY`.
3. **Configure Sender**:
   - Go to **Senders & IPs**.
   - Add a sender matching your domain (e.g., `hello@namaste-ciechanow.pl`).
   - Assign this email to `BREVO_SENDER_EMAIL`.
4. **Domain Authentication (DKIM/SPF)**:
   - For production deliverability, authenticate your sending domain inside Brevo by adding the recommended TXT records (SPF, DKIM) to your domain DNS settings.
