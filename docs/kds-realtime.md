# KDS Realtime Synchronization & Notifications

This document explains the technical implementation of the real-time updates, fallback polling, and sound notifications for the Kitchen Display System (KDS).

---

## 1. Realtime Architecture

To ensure the kitchen receives orders instantly when they are approved by the manager without manual page refreshes, the KDS leverages Supabase Realtime (WebSockets) combined with a robust HTTP polling fallback.

```
+-----------------------------------+
|          Supabase Database        |
+-----------------+-----------------+
                  | (Write event)
                  v
       [ Supabase Realtime ]
                  | (WebSocket message)
                  v
      [ Client: Postgres Changes ]
                  | (Trigger refetch)
                  v
       [ Fetch Orders via API ]
```

### PostgreSQL Table Subscriptions
The KDS Board registers a listener on the `orders` table using the Supabase client:
```typescript
const channel = supabase
  .channel('kds-orders')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    () => {
      // Trigger API fetch for new order list
      fetchOrders();
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  });
```

---

## 2. Polling Fallback Strategy

WebSockets can disconnect due to network instability, router refreshes, or device sleep states. To guarantee that the kitchen is never left in the dark:
- A background timer runs every **30 seconds** (`POLL_INTERVAL = 30000`).
- This interval calls `fetchOrders()` over standard HTTPS.
- If the WebSocket disconnects, the connection status indicator switches to **Reconnecting / Offline** (Yellow badge), but new orders will still appear within a maximum of 30 seconds.
- Once the socket reconnects, the status badge returns to **Live** (Green badge) instantly.

---

## 3. Audio & Visual Notifications

Cooking environments are loud and busy; kitchen staff cannot continuously look at a screen. Therefore, the KDS implements two channels of notification:

### A. Web Audio API Alert
- When a new order with status `approved` enters the system, the board plays a double-beep audio alert.
- **No external files**: Sound is generated programmatically using the browser's `AudioContext` oscillator. This avoids loading large `.mp3` assets and works instantly.
- **Sound Toggle**: Under browser security models, audio cannot autoplay without user interaction. Staff must click the **Sound** icon in the header to activate alerts.
- **Preference Persistence**: The user's sound preference is saved to `localStorage` under `kds_sound_enabled` so it persists across page reloads.

### B. Visual Pulse Alert
- Newly arrived orders flash a gold glow to immediately stand out.
- Controlled by the `newOrderIds` state, which marks an order as "new" for 5 seconds upon arrival.
- **Animation**: Implemented using the `animate-pulse-once` CSS utility class:
  ```css
  @keyframes pulse-once {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
    50% { box-shadow: 0 0 20px 6px rgba(245, 158, 11, 0.3); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  ```
- **Accessibility**: The pulse respects `prefers-reduced-motion` and scales down animation speeds automatically if the OS has reduced motion enabled.
