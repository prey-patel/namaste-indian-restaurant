# KDS QA Verification Checklist

This document provides the QA steps required to verify the Kitchen Display System (KDS) functionality in a staging or development environment.

---

## 1. Authentication & Role Guards

| Test Case | Steps | Expected Result | Pass/Fail |
|---|---|---|---|
| **1.1 Unauthenticated Access** | Navigate directly to `/admin/kds` without logging in. | Redirected to `/admin/login`. | |
| **1.2 Staff Role Access** | Log in with a user whose role is `staff` and try to access `/admin/kds`. | Redirected to `/admin`. Access is denied. | |
| **1.3 Kitchen Role Access** | Log in with a user whose role is `kitchen` and access `/admin/kds`. | Access granted. The KDS board is displayed. | |
| **1.4 Manager Role Access** | Log in with a user whose role is `manager` and access `/admin/kds`. | Access granted. The KDS board is displayed. | |
| **1.5 Owner Role Access** | Log in with a user whose role is `owner` and access `/admin/kds`. | Access granted. The KDS board is displayed. | |
| **1.6 Inactive Profile** | Access KDS with an authenticated kitchen role profile that has `is_active = false`. | Redirected to login. Access is denied. | |

---

## 2. Display & Layout Verification

| Test Case | Steps | Expected Result | Pass/Fail |
|---|---|---|---|
| **2.1 Minimal Layout** | Access `/admin/kds` in standard mode. | The sidebar and top navigation of the admin panel are hidden. | |
| **2.2 Fullscreen Toggle** | Click the Maximize icon in the top right. | The KDS takes up the entire browser viewport (fixed overlay). | |
| **2.3 Data Minimization** | Inspect an order card. | Shows order reference (e.g. `#E3F9B2`), first name only, and items. Phone, email, address, and admin notes are hidden. | |
| **2.4 Three-Column Layout** | Observe columns. | Columns are labeled: **New / Confirmed**, **Preparing**, and **Ready / Handoff**. | |
| **2.5 Timer & Countdown** | View active orders. | Elapsed timer increases. ETA shows countdown minutes remaining (e.g., `(23m)`). | |
| **2.6 Urgency Borders** | Set different ETA times on orders. | - New/confirmed: Gold border.<br>- Preparing, >10m left: Blue border.<br>- Preparing, <=10m left: Orange border.<br>- Preparing, <=5m or overdue: Red border.<br>- Ready: Green border. | |

---

## 3. Workflow & Transition Actions

### Takeaway Order Flow
1. **Submit Order**: Customer submits a takeaway order (starts as `pending`).
2. **Confirm (Admin)**: Admin confirms order in Order Management, choosing a 30-minute ETA.
   - *KDS Check*: The order appears in the **New / Confirmed** column with a countdown.
3. **Start Preparing (Kitchen)**: Kitchen clicks **Start Preparing**.
   - *KDS Check*: Order moves to **Preparing** column.
   - *DB Check*: `status` is `preparing`, and `preparing_at` timestamp is set.
4. **Mark Ready (Kitchen)**: Kitchen clicks **Mark Ready**.
   - *KDS Check*: Order moves to **Ready / Handoff** column. Action button disappears; text shows "Ready for pickup".
   - *Customer Check*: Customer tracking page shows order status as "Ready for pickup".
   - *DB Check*: `status` is `ready_for_pickup`, and `ready_at` is set.
5. **Complete (Admin)**: Admin marks the order complete in Order Management after confirming payment.
   - *KDS Check*: Order disappears from the board.

### Delivery Order Flow
1. **Submit Order**: Customer submits a delivery order (starts as `pending`).
2. **Confirm (Admin)**: Admin confirms order in Order Management, choosing a 50-minute ETA.
   - *KDS Check*: The order appears in the **New / Confirmed** column with a countdown.
3. **Start Preparing (Kitchen)**: Kitchen clicks **Start Preparing**.
   - *KDS Check*: Order moves to **Preparing** column.
4. **Hand to Courier (Kitchen)**: Kitchen clicks **Handed to Courier**.
   - *KDS Check*: Order moves to **Ready / Handoff** column. Action button disappears; text shows "Out for Delivery".
   - *Customer Check*: Customer tracking page shows order status as "On the way".
   - *DB Check*: `status` is `out_for_delivery`, and `dispatched_at` is set.
5. **Complete (Admin)**: Admin completes the order in Order Management after courier reports drop-off.
   - *KDS Check*: Order disappears from the board.

---

## 4. Notifications & Connection Checks

| Test Case | Steps | Expected Result | Pass/Fail |
|---|---|---|---|
| **4.1 Sound Toggle** | Click the speaker icon to enable. | Playback test beep is heard. LocalStorage `kds_sound_enabled` is set to `true`. | |
| **4.2 Realtime Alert** | With sound enabled, approve a new order from a separate admin window. | KDS receives the order instantly via WebSockets, flashes a gold glow, and plays a double-beep alert. | |
| **4.3 Offline Indicator** | Disconnect your internet connection. | The network indicator changes to yellow: **Reconnecting...** | |
| **4.4 Polling Fallback** | Keep offline, then reconnect. | The system reconnects. Polling interval executes every 30s as a fallback. | |
