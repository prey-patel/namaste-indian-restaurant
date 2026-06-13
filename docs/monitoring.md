# Observability & Monitoring Plan

This document outlines the recommended observability practices, logging structures, and troubleshooting steps for the Namaste Indian Restaurant application in production.

---

## 1. Application-Level Monitoring (Sentry)

It is highly recommended to configure Sentry for Next.js to monitor errors across the stack:
- **Client Errors**: Captures runtime JavaScript errors in the browser.
- **Server Errors**: Captures errors thrown inside Server Actions and Server Components.
- **Vercel logs**: Integrating Sentry with Vercel permits tracking performance metrics (LCP, FID, CLS) and API request latencies.

---

## 2. Server-Side Execution Logs

- **Vercel Console Logs**:
  All `console.error` and uncaught server action exceptions are recorded in Vercel's real-time logs.
  - Server actions are named by their function name (e.g. `createOrderRequestAction`).
  - Search Vercel logs for `[Rate Limit Exception]`, `[KDS start preparing failed]`, or `[SMTP Error]` to diagnose integration issues.

- **Supabase Database Logs**:
  Database-level exceptions (like RLS policy violations or trigger failures) can be inspected in the Supabase Dashboard:
  1. Navigate to **Project Settings** → **Database Logs**.
  2. Filter by severity level `ERROR` or search for trigger keywords (`trg_check_order_update_permissions`, `trg_check_profile_update_permissions`).
  3. RLS violations typically raise a `42501` PostgreSQL permission error.

---

## 3. KDS & Realtime Connection Debugging

If kitchen staff report KDS connection issues:

1. **Verify Connection Badge**:
   - **Green (Live)**: WebSocket channel is active and listening to updates.
   - **Yellow (Reconnecting)**: WebSocket connection dropped. The board automatically falls back to standard HTTP polling every 30 seconds.
2. **WebSocket Inspections**:
   - Open browser DevTools (F12) → **Network** tab → Filter by **WS** (WebSockets).
   - Check the `realtime/v1` WebSocket handshake. If it returns `403`, verify the anon key configuration.
3. **Sound Troubleshooting**:
   - Audio is generated using the browser's `AudioContext`.
   - Browser policies block audio autoplay without user interaction.
   - Confirm staff have clicked the **Sound On** button in the KDS header (stores `kds_sound_enabled = true` in localStorage).

---

## 4. Business Metrics & Failure Rates

Monitor these Postgres metrics weekly to detect workflow health issues:

### High Rejection / Failure Ratio
```sql
SELECT 
  status, 
  COUNT(*) as count, 
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM public.orders
WHERE created_at > now() - interval '7 days'
GROUP BY status;
```
*Note: A sudden rise in the percentage of `rejected` or `cancelled` orders indicates menu item pricing/availability discrepancies or payment collection issues.*

### Rate Limit Hits
```sql
SELECT 
  action_type, 
  COUNT(*) as block_count 
FROM public.rate_limits 
WHERE created_at > now() - interval '24 hours' 
GROUP BY action_type;
```
*Note: Spikes in rate limit blocks signal bot attacks or crawler scraping attempts on status lookup pages.*
