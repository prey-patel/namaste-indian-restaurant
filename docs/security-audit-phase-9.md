# Security Audit Report (Phase 9 Hardening)

This document details the security posture, RLS audit findings, and client-privacy protections in the Namaste Indian Restaurant codebase.

---

## 1. Server Action Validation & Schema Guards

All public-facing database mutations are routed through Next.js Server Actions. They enforce security using server-side validation:
1. **Zod Schema Parsing**: Input parameters are parsed and validated against schema guards:
   - `orderRequestSchema` in [orders/actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/order/actions.ts)
   - `reservationRequestSchema` in [reservations/actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/reservations/actions.ts)
   - `contactInquirySchema` in [contact/actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/contact/actions.ts)
2. **Business Rule Assertions**: Logic checks mismatching payment types (e.g. cash on delivery selected for takeaway) and past dates before database interactions.

---

## 2. Row Level Security (RLS) Audit

PostgreSQL RLS is enabled on all tables. 

| Table Name | RLS Enabled? | Write Access | Read Access |
|---|---|---|---|
| `orders` | ✅ Yes | Admins/Staff (all), Kitchen (status fields only) | Admins/Staff/Kitchen |
| `order_items` | ✅ Yes | Admins/Staff | Admins/Staff/Kitchen |
| `rate_limits` | ✅ Yes | **Database Only** (Service Role) | **Database Only** (Service Role) |
| `contact_inquiries` | ✅ Yes | Anonymous (Insert only) | Admins/Staff |

### Rate Limits Table RLS
```sql
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
```
No policies are defined on `public.rate_limits`. This ensures that standard users (anonymous and authenticated) cannot query or insert logs, preventing IP-scraping or rate-limit logs flooding. Only backend calls using `createAdminClient()` (using `SUPABASE_SERVICE_ROLE_KEY`) can read/write rate limit records.

---

## 3. Data Privacy & Leak Protection

### Public Order/Reservation Tracking
Customers track status using a randomized tracking token (`token` UUID).
- **RPC Search**: Tracking uses security-restricted SQL functions `get_public_order_details_by_token` and `get_public_reservation_status_by_token`.
- **Field Minimization**: These RPCs do not select `admin_notes` or internal notes, completely preventing disclosure of manager remarks to the customer.
- **Not Indexable**: Tracking pages include the `<meta name="robots" content="noindex, nofollow" />` headers and are excluded from the sitemap.

### Kitchen Privacy (KDS Data Minimization)
The KDS server component query (`app/admin/kds/page.tsx`) implements data minimization before feeding data to the card:
- Splits `customer_name` to first word (e.g., `"John Doe"` → `"John"`).
- Completely omits `customer_email`, `customer_phone`, and `delivery_street`.
- Prevents sensitive contact details from being visible on screen in the cooking area.

---

## 4. Rate-Limiting Fallback & Fail-Closed Behavior

The rate limiter (`lib/security/rate-limit.ts`) implements a strict **fail-closed** design to guarantee production safety:

1. **DB Failures**: If a database error occurs (e.g. connection timeout or RLS issue), the `isRateLimited()` helper logs the exception server-side and throws an error.
2. **Action Fallback**: Callers wrap the rate limit checks in `try-catch` blocks.
3. **No Bypass**: If the check throws an exception, the action halts and returns a safe bilingual request verification error:
   - PL: `Wystąpił błąd weryfikacji żądania. Spróbuj ponownie później.`
   - EN: `Request verification failed. Please try again later.`
4. This ensures that database outages or connection pool exhaustion cannot be exploited to bypass rate limits.
