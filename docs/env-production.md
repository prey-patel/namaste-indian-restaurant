# Production Environment Variables Audit

This document details the environment variables configuration for the production release of the Namaste Indian Restaurant application.

---

## 1. Variable Isolation (Client vs Server)

To prevent security leaks, all environment variables are split into client-visible and server-only groups.

### Next.js Client Prefixing Rules
- **Client-Visible Variables**: Must start with `NEXT_PUBLIC_`. These are bundled into the browser bundle during compile-time.
- **Server-Only Variables**: Must NOT start with `NEXT_PUBLIC_`. They are only accessible within the Node.js runtime and are completely withheld from browser loads.

---

## 2. Environment Variables Audit List

| Variable Name | Exposure | Scope / Security Rules |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Safe. Public database endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Safe. Anon client key. Access is controlled strictly via RLS. |
| `NEXT_PUBLIC_SITE_URL` | Client | Safe. Public URL of the frontend (e.g., `https://namaste-ciechanow.pl`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | **CRITICAL**. Bypasses RLS. Must never be imported in client components. Restricted to backend-only files (`lib/supabase/admin.ts`). |
| `CONTACT_IP_HASH_SECRET` | **Server Only** | Hashing pepper for contact inquiries. Must not leak. |
| `RESERVATION_IP_HASH_SECRET` | **Server Only** | Hashing pepper for reservations. Must not leak. |
| `ORDER_IP_HASH_SECRET` | **Server Only** | Hashing pepper for orders. Must not leak. |
| `BREVO_API_KEY` | **Server Only** | Key for sending transaction emails. |
| `TELEGRAM_BOT_TOKEN` | **Server Only** | Token for dispatching admin notifications. |
| `TELEGRAM_ADMIN_CHAT_ID` | **Server Only** | Channel ID for notifications. |
| `ROUTING_PROVIDER_API_KEY` | **Server Only** | Key for distance calculation API requests. |

---

## 3. Security Hardening Checklist

1. **No committed secrets**: Neither `.env` nor `.env.local` files must be committed to git. Checked via `.gitignore`.
2. **Standard examples**: `.env.example` contains only clear placeholders.
3. **No Service-Role Key in client bundle**: Verified. `SUPABASE_SERVICE_ROLE_KEY` is only used inside server files and not referenced by any client-side JavaScript.
4. **Isolated hash peppers**: Separate peppers are used for contact form, orders, and reservations to prevent cross-referencing hashed IPs across different data contexts.
