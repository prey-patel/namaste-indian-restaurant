# Realtime Production Configuration

This document describes the production setup and reliability guidelines for Supabase Realtime on the Kitchen Display System (KDS) board.

---

## 1. Database Publication Setup (Required Step)

By default, Supabase does not broadcast changes on tables to prevent performance issues. We must explicitly add the `orders` table to the `supabase_realtime` publication.

> [!IMPORTANT]
> **Action Required on Staging/Production Database:**
> Execute the following SQL query in the Supabase SQL Editor to enable Realtime events for orders:
> ```sql
> ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
> ```
> *If the publication `supabase_realtime` does not exist, initialize it first:*
> ```sql
> CREATE PUBLICATION supabase_realtime;
> ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
> ```

---

## 2. Syncing Mechanics & Polling Fallback

1. **WebSocket Updates**: The KDS listens to PostgreSQL change events. Any `INSERT` or `UPDATE` on the `orders` table triggers an immediate refetch of the order columns and items.
2. **Polling Fallback**: If the browser's WebSocket disconnects (e.g. tablet goes out of WiFi range or enters sleep mode), the system switches to background HTTP polling every **30 seconds**.
3. **Re-connection**: Once the network recovers, the Supabase client re-subscribes, updating the header badge from **Reconnecting...** (Yellow) to **Live** (Green).

---

## 3. Audio & Visual Delivery Rules

### Autoplay Restriction Bypasses
Browsers block audio contexts unless initiated by a direct user click.
- **Sound Toggle**: The user must click the sound icon in the header. This instantiates a web audio context and plays a short baseline test beep.
- **Preference Persistence**: The sound choice (`true` or `false`) is saved in the browser's `localStorage` as `kds_sound_enabled`. On subsequent reloads, the KDS board attempts to resume the context automatically when a user clicks anywhere on the page.

### Double-Beep Generation (Web Audio API)
Audio alert sounds are generated dynamically using oscillator nodes. No external `.mp3` files are requested, avoiding network latency or load delays.
```typescript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
osc.type = 'sine';
// ... frequency sequence: 800Hz beep -> 600Hz beep
```

---

## 4. Verification Check
To verify that Realtime is working:
1. Open the `/admin/kds` page in one tab and the `/admin/orders` page in another.
2. Confirm a pending order on the orders page.
3. Check the KDS tab: the order should appear in the **New / Confirmed** column within 1 second, accompanied by a double-beep audio alert (if sound is toggled on) and a gold flash animation.
4. If it does not appear within 1 second but does appear after 30 seconds, the WebSocket is inactive (reconnecting) and the system is using the polling fallback. Check database publication setup.
