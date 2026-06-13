# Regression QA Results (Phase 9 Hardening)

This document contains the regression testing checklist and verification results covering Phases 1 to 8.

---

## 1. Regression Test Matrix

| # | Test Case | Scope | Verified Behavior | Status |
|---|---|---|---|---|
| 1 | **Public website pages** | Website | Home, Menu, Story, Contact, and Privacy pages load correctly. | ✅ Pass |
| 2 | **Language switching PL/EN** | Localization | Language selection toggles translations across all components seamlessly. | ✅ Pass |
| 3 | **Contact form** | Forms | Submissions succeed, sanitize input, and trigger database-backed rate-limits. | ✅ Pass |
| 4 | **Menu page** | Menu | Items load with PL/EN details, spice indicators, and allergens. | ✅ Pass |
| 5 | **Admin login** | Auth | Safe login page with profile verification. | ✅ Pass |
| 6 | **Admin menu CMS** | CMS | Items can be created, updated, and deleted (admin/manager only). | ✅ Pass |
| 7 | **Reservation submission** | Reservations | Guest forms parse target times, check availability, and enforce rate limits. | ✅ Pass |
| 8 | **Reservation status tracking** | Tracking | Customer tracking handles UUID tokens and rate-limits lookup attempts. | ✅ Pass |
| 9 | **Admin reservation management** | Management | Manager can view, confirm, reject, cancel, and seat reservations. | ✅ Pass |
| 10 | **Public takeaway order** | Ordering | Customer submits takeaway orders securely. | ✅ Pass |
| 11 | **Public delivery order** | Ordering | Customer submits delivery orders securely. | ✅ Pass |
| 12 | **Admin order confirm/reject/cancel/ETA** | Management | Admin confirms order with ETA, rejects, cancels, and audits timelines. | ✅ Pass |
| 13 | **Customer order tracking** | Tracking | Shows dynamic ETA countdown in minutes, Warsaw timezone, and status updates. | ✅ Pass |
| 14 | **KDS order visibility** | KDS | Only approved, preparing, ready_for_pickup, and out_for_delivery are shown. | ✅ Pass |
| 15 | **KDS start preparing** | KDS | Kitchen moves order to "Preparing" (updates `preparing_at`). | ✅ Pass |
| 16 | **KDS takeaway ready** | KDS | Takeaway transitions to `ready_for_pickup` (updates `ready_at`). | ✅ Pass |
| 17 | **KDS delivery out-for-delivery** | KDS | Delivery transitions to `out_for_delivery` (updates `dispatched_at`; `ready_at` is `null`). | ✅ Pass |
| 18 | **Admin complete order** | Management | Admin marks order complete only after checking payment confirmation. | ✅ Pass |
| 19 | **Staff blocked from KDS** | Security | Staff profiles are blocked from KDS page routes and server actions. | ✅ Pass |
| 20 | **Anonymous blocked from admin/KDS** | Security | Unauthenticated clients are blocked from routing and restricted by database RLS. | ✅ Pass |
| 21 | **Public tracking token invalid case** | Security | Invalid UUIDs or tokens render a safe "Not Found" page instead of leaking errors. | ✅ Pass |
| 22 | **Signed image URL behavior** | Storage | Storage images are served securely via private buckets and signed links. | ✅ Pass |

---

## 2. Key Verification Notes

1. **Rate Limiting Persistence**: The public contact, order, and reservation submissions are now verified to be rate-limited persistently in the database, blocking the 6th order request or 4th reservation request within an hour.
2. **KDS Workflows**: The KDS transitions correctly separate takeaway status (`ready_for_pickup`) from delivery status (`out_for_delivery`) at both the application action level and database trigger level.
3. **Information Privacy**: No contact numbers, addresses, emails, or admin internal notes are sent to the browser for KDS display or public tracking pages.
