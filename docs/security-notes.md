# Security Notes

This document highlights critical security rules for developers working on the Namaste Indian Restaurant codebase:

1.  **Row Level Security (RLS):** All 24 database tables must have RLS active. Public access is strictly read-only for public assets or write-blocked. Public submissions (e.g. orders, reservations) go through server actions which bypass RLS using the secure service-role client.
2.  **No Secret Exposures:** Never import `lib/supabase/admin.ts` or reference service-role keys in components that are not running server-side.
3.  **Strict Token Lookups:** Public tracking pages must use secure `SECURITY DEFINER` RPC database functions checking both the ID and secure UUID token.
4.  **Order Recalculation:** Always recalculate prices, delivery fees, and packaging charges server-side. Never trust frontend calculations.
5.  **Address Masking:** Public order tracking returns a masked address field (`delivery_address_public`) created by splitting the street address and hiding house/apartment numbers with `**`.
6.  **Staff & Kitchen Restrictions:** Staff cannot modify pricing totals, fees, or payment methods. Kitchen staff can only change status-related fields on orders and are restricted to transitioning status to preparing, ready_for_pickup, or completed.
7.  **Extension Security:** `pgcrypto` is required to generate secure, cryptographically random UUIDs (`gen_random_uuid()`).
