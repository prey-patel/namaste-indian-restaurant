# Transactional Email Communication System (Phase 12A)

This document outlines the architecture, integration flow, and details of the transactional email notification system built for **Namaste Indian Restaurant**.

## Overview

The transactional email communication system enables automated notifications for the lifecycle of customer reservations and online orders using **Brevo (formerly Sendinblue)**. The system is designed to be secure, highly reliable, localized (Polish & English), and idempotent.

## Key Features

1. **Transactional SMTP Integration**: Native REST-based API connection to Brevo SMTP (`https://api.brevo.com/v3/smtp/email`) using secure token/key verification.
2. **Strict Notification Matrix**: Minimal notifications covering critical customer lifecycle and admin alerts.
3. **Secure One-Click Admin Actions**: Action links embedded in admin alert emails allowing instant approval or rejection of requests.
4. **Idempotency Protection**: Enforced database level checks (`entity_type + entity_id + template_key + recipient_email`) preventing duplicate email delivery.
5. **Privacy Preservation**: Admin action landing pages show only name initials/first names, concealing customer contact info, special requests, and address details.
6. **Fail-safe Design**: Email triggers are wrapped in isolated `try/catch` and support `EMAIL_ENABLED` flags, ensuring database transactions and business logic succeed even if the email API fails.

## Architecture & File Directory

- `lib/email/brevo.ts`: Core client executing native fetch requests to Brevo's HTTP API.
- `lib/email/action-tokens.ts`: Handles secure HMAC-SHA256 generation, verification, and consumption of one-time admin action tokens.
- `lib/email/send-reservation-emails.ts`: Orchestrator for reservation emails (received, confirmed, rejected, cancelled, admin alert).
- `lib/email/send-order-emails.ts`: Orchestrator for order emails (received, approved, rejected, takeaway ready, delivery completed, admin alert).
- `lib/email/templates/`: Localized HTML layouts for reservations and orders.
- `app/admin/email-actions/`: Confirmation pages for admin actions:
  - `reservation/[action]/page.tsx` & `confirm-form.tsx`
  - `order/[action]/page.tsx` & `confirm-form.tsx`
