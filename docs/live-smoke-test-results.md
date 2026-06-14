# Live Smoke Test Results (Phase 10)

This document records the exact test scenarios and verification results performed on the live deployed Vercel URL.

**Deployed Vercel URL tested**: `https://namaste-indian-restaurant-fshsxaxpq-prey.vercel.app`  
**Database Host**: `aws-1-eu-central-1.pooler.supabase.com` (Project: `trccyyalqgsjkuszaqhr`)

---

## 1. Public Website Smoke Test

| Page / Feature | Localized Path | Result | Notes |
|---|---|---|---|
| Homepage | `/pl` / `/en` | ✅ PASS | Loads in < 1s. Banner message and info strip correct. |
| Menu Page | `/pl/menu` / `/en/menu` | ✅ PASS | Renders categories and items from Supabase. |
| Story Page | `/pl/our-story` / `/en/our-story` | ✅ PASS | Styled correctly, zero broken assets. |
| Reservation Page | `/pl/reservations` / `/en/reservations` | ✅ PASS | Form loads. Inputs validated correctly. |
| Contact Page | `/pl/contact` / `/en/contact` | ✅ PASS | Contact form ready for inputs. |
| Terms & Privacy | `/pl/terms` / `/pl/privacy-policy` | ✅ PASS | Renders fine, links active in footer. |
| 404 Page | `/pl/non-existent-page` | ✅ PASS | Beautiful branded 404 page renders. |
| Mobile Layout | - | ✅ PASS | Tested drawer menu and responsive grid. |
| Console Errors | - | ✅ PASS | Zero uncaught exceptions or error logs. |

---

## 2. Live Contact Form Test
- **Input Submission**: Submitted name, subject, email, and message on `/pl/contact`.
- **Database Logs**: Confirmed inquiry insertion in `contact_inquiries` table with `status = 'new'`.
- **IP Anonymization**: IP address extracted from `x-forwarded-for` header and hashed with `CONTACT_IP_HASH_SECRET` using HMAC-SHA256. Raw IP is not stored.
- **Rate Limit Trigger**: 6th submission blocked within 1 hour. Correctly returned translated message: *"Zbyt wiele zapytań..."*

---

## 3. Live Reservation Test
- **Submission**: Reserved table for 4 guests.
- **Initial State**: Order created as `pending` requiring admin confirmation.
- **Token Tracking**: Redirected to `/pl/reservations/status?id=<uuid>&token=<uuid>`.
- **Crawl Protection**: Page source inspected; verified presence of `<meta name="robots" content="noindex, nofollow" />`.
- **Admin Visibility**: Reservation appeared in `/admin/reservations`.

---

## 4. Live Public Order Test
- **Mismatched Payments**: Tried submitting Takeaway with "Cash on Delivery". Rejected server-side by schema validator.
- **Unresolved Delivery Fee**: Unresolved distance shows correct validation instead of displaying free delivery.
- **Submission**: Submitted takeaway order and delivery order successfully. Both registered as `pending` with `payment_status = 'pending'`.

---

## 5. Live Admin Order & KDS Workflows
- **Takeaway Order**:
  1. Received in `/admin/orders`.
  2. Approved with `30` min ETA.
  3. Customer tracking page updated to `confirmed` with correct ETA.
  4. Appeared instantly on KDS board (`/admin/kds`).
  5. Kitchen clicked **Start Preparing** (status: `preparing`).
  6. Kitchen clicked **Mark Ready** (status: `ready_for_pickup`).
  7. Customer tracking page updated to `Ready for Pickup`.
  8. Admin clicked **Complete Order** after confirming payment. (Order completed, status: `completed`, payment: `paid`).
- **Delivery Order**:
  1. Approved with `50` min ETA.
  2. Kitchen clicked **Start Preparing** (status: `preparing`).
  3. Kitchen clicked **Handed to Courier** (status: `out_for_delivery`).
  4. Customer tracking page updated to `Order is on the way`.
  5. Admin clicked **Complete Order** after cash/card confirmation. (Order completed, status: `completed`, payment: `paid`).
- **Kitchen Restrictions**: Confirmed kitchen cannot transition to `completed` and cannot modify totals, customer email, phone, or billing details.
- **KDS Privacy**: KDS displays customer first name only (`John` instead of `John Doe`). Customer phone, email, and street address are hidden.

---

## 6. Live Security & Rate Limiting Tests
- **RLS Enforcement**: Verified that `rate_limits` table rejects anonymous read/write queries.
- **Fail-Closed Fallback**: Blocked lookups during simulated database connection drops, returning clean user messages without exposing SQL details.
