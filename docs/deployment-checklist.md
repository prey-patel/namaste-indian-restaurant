# Production Deployment Checklist

This checklist is the official runbook for deploying Phase 9 to staging and production environments.

---

## 1. Pre-Deployment (Pre-Flight Checks)

- [ ] **Database Backup**: Run a full database backup in the Supabase Dashboard:
  - Go to **Database** → **Backups** → Click **Create Backup**.
- [ ] **Secrets Verification**: Confirm `.env.local` is not tracked/committed by running `git status --ignored` or checking the repository.
- [ ] **Secrets Collection**: Gather all production keys to sync:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CONTACT_IP_HASH_SECRET`
  - `RESERVATION_IP_HASH_SECRET`
  - `ORDER_IP_HASH_SECRET`
  - `BREVO_API_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_ADMIN_CHAT_ID`

---

## 2. Database Migration Deployment

Apply the schema updates to the production database:

### Option A: Via Supabase CLI (Recommended)
1. Dry run verify:
   ```bash
   supabase db lint
   ```
2. Apply migrations to remote:
   ```bash
   supabase db push
   ```

### Option B: Via SQL Editor (Manual Update)
1. Run the contents of `supabase/migrations/20260613000001_kds_kitchen_transition.sql` in the Supabase SQL editor.
2. Run the contents of `supabase/migrations/20260613000002_persistent_rate_limiting.sql` in the Supabase SQL editor.

---

## 3. Environment Variable Sync (Vercel)

- [ ] Navigate to **Vercel Dashboard** → **Settings** → **Environment Variables**.
- [ ] Add all variables listed in `.env.example`.
- [ ] **Security Enforcement**: Ensure `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_IP_HASH_SECRET`, `RESERVATION_IP_HASH_SECRET`, and `ORDER_IP_HASH_SECRET` are **never** checked as public client-exposed variables. They must remain server-side only.

---

## 4. Frontend Compilation & Deployment

- [ ] Merge the approved branch to `main` (triggering automatic Vercel production build) or run `vercel --prod` via CLI.
- [ ] Monitor build output to confirm successful TypeScript compilation (`tsc`), linting (`next lint`), and static page generation.

---

## 5. Post-Deployment Smoke Tests (Live Production URL)

Verify the following items on the live deployed Vercel URL:

1. **Access Controls**:
   - Access `/admin/kds` and `/admin/orders` in an anonymous/incognito window. Confirm you are blocked and redirected to `/admin/login`.
   - Access KDS as kitchen user; confirm active owner, manager, and kitchen can access. Verify staff and public are blocked.
2. **Data Privacy**:
   - Check KDS orders board. Confirm that customer names are truncated to first name only, and email, phone, and address are hidden from kitchen view.
   - Inspect order/reservation status tracking pages. Confirm they contain `<meta name="robots" content="noindex, nofollow" />` in their HTML source.
3. **Contact Submission**:
   - Submit contact form inquiry on `/contact`. Confirm the submission succeeds and is logged in the `contact_inquiries` table.
4. **Reservation Submission**:
   - Submit a test reservation on `/reservations`.
5. **Takeaway & Delivery Orders**:
   - Submit a takeaway order and a delivery order from public pages.
   - Access the admin portal, approve the orders, and set appropriate ETAs.
6. **KDS Realtime Check**:
   - Verify that approved orders appear instantly in KDS in realtime without manual page refreshes.
   - Transition order status in KDS (approved ➔ preparing ➔ ready_for_pickup/out_for_delivery) and verify that the customer tracking page updates in realtime.
7. **Rate Limiting Check**:
   - Trigger the rate limit on order lookups or submissions by issuing requests consecutively. Confirm the 429 page or error message is returned with the correct retry cooldown.
