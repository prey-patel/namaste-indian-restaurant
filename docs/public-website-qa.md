# Public Website Final QA Verification Report

This document reports the responsive, accessibility, and security validation checks performed at the end of **Phase 4B**.

---

## 1. Responsive Viewport Audits

Renderings have been verified on standard breakpoints:
*   **360px (Mobile):** Contact form fields scale to 100% width. Header menu collapses into the drawer. No horizontal scrolling occurs.
*   **768px (Tablet):** Two-column layouts wrap appropriately. Grid systems adjust cleanly.
*   **1024px & 1440px (Laptop/Desktop):** Layout components center at `max-w-7xl` with clean grid spacing.

---

## 2. Accessibility & UX Audits

*   **Keyboard Friendly:** Focus indicators are visible. Form inputs are focusable via `tab` loops.
*   **Aria Labels:** Screen readers can announce form labels. The custom map component includes `aria-label` and `role="application"`.
*   **Reduced Motion:** Standard spin animation on the Mandala watermark stops on mobile and respects `prefers-reduced-motion` settings.

---

## 3. Security Audits

The contact form database writes and access permissions have been verified using a database script:
*   **Valid Insert:** Submitting a correct payload creates exactly one row in the `contact_inquiries` table.
*   **Invalid block:** Email format validation, missing consent check, empty fields, and messages > 1000 characters are correctly blocked.
*   **IP Anonymization:** Raw IP addresses are hashed using `CONTACT_IP_HASH_SECRET`. No raw client IPs are logged.
*   **RLS Active:** Anonymous clients cannot directly run `SELECT` on `contact_inquiries` (returns 0 rows), and cannot run client-side `INSERT` (returns RLS policy violation error).
*   **Service-Role key:** Kept secure in server environment variables, never leaked to the browser bundle.
*   **Settings security:** RPC `get_public_system_settings` exposes only customer-safe keys.
