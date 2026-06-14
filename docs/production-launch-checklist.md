# Production Launch Checklist (Phase 10 Sign-off)

This document is the official release checklist for the Namaste Indian Restaurant production deployment. It contains safety, database, environment, and workflow verification steps.

---

## 🏁 1. Repository & Secret Safety Audit
- [x] **No committed `.env.local`**: Verified that `.env.local` is listed in `.gitignore` and is not tracked in the git tree.
- [x] **No committed service-role keys**: Verified that no `SUPABASE_SERVICE_ROLE_KEY` values are present in commits or source files.
- [x] **No committed database credentials**: Verified that database connection strings, passwords, or hashes are not hardcoded.
- [x] **No committed seed customer data**: Verified that `db_backup_phase_2.sql` and `db_backup_phase_2.json` contain only system settings, categories, and menu structures, and no real customer emails/details.

---

## 🗄️ 2. Supabase Migration Status
- [x] **KDS triggers migration active**:
  - Migration file: [`20260613000001_kds_kitchen_transition.sql`](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/supabase/migrations/20260613000001_kds_kitchen_transition.sql)
  - Applied and verified on the remote database.
- [x] **Persistent rate limits migration active**:
  - Migration file: [`20260613000002_persistent_rate_limiting.sql`](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/supabase/migrations/20260613000002_persistent_rate_limiting.sql)
  - Applied and verified on the remote database.
- [x] **Table `public.rate_limits` structure**:
  - Columns: `id`, `action_type`, `ip_hash`, `created_at`.
  - CHECK constraint: `action_type IN ('contact', 'order', 'reservation', 'order_status_lookup', 'reservation_status_lookup')`.
- [x] **RLS and Policies on `rate_limits`**:
  - Row Level Security (RLS) is enabled.
  - Zero browser-readable (`SELECT`) or browser-writable (`INSERT`/`UPDATE`/`DELETE`) policies exist. Access is bypassed only by server-side trusted service-role calls.

---

## 🌐 3. Vercel Environment Variables
- [x] **`NEXT_PUBLIC_SUPABASE_URL`**: Present and pointing to production.
- [x] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Present and configured.
- [x] **`SUPABASE_SERVICE_ROLE_KEY`**: Present, configured, and restricted to Serverless environment only (not client-exposed).
- [x] **`NEXT_PUBLIC_SITE_URL`**: Present (configured to `https://namaste-indian-restaurant-fshsxaxpq-prey.vercel.app`).
- [x] **`ORDER_IP_HASH_SECRET`**: Present, secure, and production-specific.
- [x] **`RESERVATION_IP_HASH_SECRET`**: Present, secure, and production-specific.
- [x] **`CONTACT_IP_HASH_SECRET`**: Present, secure, and production-specific.

---

## 🧪 4. Live Verification Workflows
- [x] **Live Public Page Load**: Verified homepage, menu, story, contact, terms, privacy, and 404 pages load with no console errors or broken assets.
- [x] **Bilingual Support (PL/EN)**: Language switcher and alternated URL prefixes function correctly.
- [x] **Live Contact Form Inquiry**: Rate limiter triggers at 5/hr. Submissions are successfully stored in `contact_inquiries`.
- [x] **Live Reservation request**: Enforces manual review state. Token tracking links are set to `noindex, nofollow`.
- [x] **Live Takeaway Order Submission**: Pending state ➔ Admin ETA ➔ KDS preparing ➔ KDS ready for pickup ➔ Customer tracking updates.
- [x] **Live Delivery Order Submission**: Pending state ➔ Admin ETA ➔ KDS preparing ➔ KDS out for delivery ➔ Customer tracking updates.
- [x] **Data Minimization on KDS**: Verified that name-splitting (first name only) works and email/phone/street are omitted from KDS cards.
- [x] **Rate Limiting Checks**: Triggering 6th order, 4th reservation, or 31st status lookup correctly returns safe, translated retry pages.
- [x] **Rollback Readiness**: DB backups and Vercel version history checked.
