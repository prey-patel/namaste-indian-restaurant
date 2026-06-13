# Contact Form Security & Anti-Abuse Controls

This document details the security layers, validations, and rate-limiting protocols governing public contact form submissions.

---

## 1. Data Integrity & Validations

Form submissions are sent to a Next.js Server Action (`submitContactInquiry`) at `app/[locale]/(public)/contact/actions.ts`.
*   **Schema Check:** Validated against a strict Zod schema (`contactInquirySchema` from `lib/validation/schemas.ts`), which checks for correct email formatting, consent agreement, and mandatory fields.
*   **Input Sanitization:** Strips any HTML tags from text inputs to block Cross-Site Scripting (XSS) or database injection attempts.
*   **Max Length Bounds:** Restricts name to 100 characters, subject to 150 characters, and message body to 1000 characters.

---

## 2. Privacy & IP Anonymization

To comply with GDPR and privacy rules, we do not store raw IP addresses in the database.
*   **IP Hashing:** The client IP is extracted from request headers (`x-forwarded-for` or `x-real-ip`). It is hashed with SHA-256 combined with a secure server-side salt/pepper (`CONTACT_IP_HASH_SECRET`).
*   **Environment secret:** `CONTACT_IP_HASH_SECRET` is defined in `.env.local` and never exposed to client-side JS. If missing in development, a warning is printed and a fallback salt is used.
*   **Fallback:** If IP headers are completely absent, it falls back to `'unknown-ip'`.

---

## 3. Rate-Limiting & Anti-Spam

*   **Rate Limiter:** Queries `contact_inquiries` using the hashed IP. If the hashed IP has submitted more than 5 inquiries within the last hour, the Server Action immediately rejects the submission with a `rate-limit` error.
*   **Cloudflare Turnstile:** A visual placeholder and front-end verification container are added. Server-side validation should be activated at `actions.ts` during production deployment using real Cloudflare Turnstile API keys.
*   **Database Writes:** Submissions are written via the secure `createAdminClient()` using the service-role key. Row-Level Security (RLS) policies prevent anonymous public clients from inserting rows directly, blocking client-side database manipulation.
