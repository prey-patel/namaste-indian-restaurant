# Phase 7B — Admin Order Management + ETA Workflow

## Overview

Phase 7B adds admin-side order management capabilities to the Namaste Indian Restaurant platform. It allows owners/managers to review, confirm, reject, cancel, update ETAs, and complete delivery/takeaway orders submitted by customers in Phase 7A.

---

## Architecture

### Server Actions (`app/admin/orders/actions.ts`)

All mutations are protected server actions requiring `owner` or `manager` role with `is_active = true`.

| Action | From Status(es) | To Status | Side Effects |
|---|---|---|---|
| `confirmOrderAction` | `pending` | `approved` | Sets `estimated_time = now + etaMinutes`, `approved_at = now` |
| `rejectOrderAction` | `pending` | `rejected` | Sets `rejection_reason` (sanitized) |
| `cancelOrderAction` | `pending`, `approved`, `preparing` | `cancelled` | Sets `cancellation_reason` (sanitized) |
| `startPreparingOrderAction` | `approved` | `preparing` | Sets `preparing_at = now` |
| `markOrderReadyAction` (takeaway) | `approved`, `preparing` | `ready_for_pickup` | Sets `ready_at = now` |
| `markOrderReadyAction` (delivery) | `approved`, `preparing` | `out_for_delivery` | Sets `dispatched_at = now` |
| `completeOrderAction` | `ready_for_pickup`, `out_for_delivery` | `completed` | Sets `completed_at = now`; optionally `payment_status = 'paid'` only if admin confirms |
| `updateOrderEtaAction` | `approved`, `preparing` | (same) | Updates `estimated_time = now + etaMinutes` |

### Database Status Mapping

- Database stores `'approved'` for confirmed orders.
- User-facing UI, translations, and timeline logs display **Confirmed** / **Potwierdzone**.
- No database schema changes were made.

---

## Pages & Components

### Admin Orders Dashboard (`/admin/orders`)

- **Server page**: `app/admin/orders/page.tsx` — queries metrics (pending, confirmed, ready, completed today) and filtered order list.
- **Client component**: `components/admin/orders/orders-dashboard.tsx` — stats cards, search/filter bar, responsive table/card layout, action buttons, modal triggers.

### Admin Order Detail (`/admin/orders/[id]`)

- **Server page**: `app/admin/orders/[id]/page.tsx` — loads order, items, and timeline audit log.
- **Client component**: `components/admin/orders/order-details-client.tsx` — full detail view with:
  - Customer info cards (name, phone, email, order type)
  - Delivery address (if delivery)
  - Payment method and status
  - Customer notes
  - Rejection/cancellation reasons
  - ETA card with absolute time + relative minutes + overdue indicator
  - Items list with per-item pricing and notes
  - Pricing summary (subtotal, packaging, delivery fee, total)
  - Action buttons (confirm, reject, cancel, prepare, ready/dispatch, complete, update ETA)
  - Timeline audit log with actor attribution

### Action Modals (`components/admin/orders/order-modals.tsx`)

- `ConfirmOrderModal` — ETA selector (quick buttons + custom input)
- `RejectOrderModal` — reason textarea (required, sanitized)
- `CancelOrderModal` — reason textarea (required, sanitized)
- `UpdateEtaModal` — reuses ConfirmOrderModal with different title
- `CompleteOrderModal` — payment received checkbox confirmation

### Customer Tracking Page (`/[locale]/order/status`)

Upgraded with:
- **ETA display**: Shows "Estimated pickup/delivery time: around HH:MM (approximately X minutes)" when `estimated_time` exists and order is in an active status.
- **Overdue indicator**: Red styling when ETA has passed.
- **Ready for pickup message**: Shown for takeaway orders in `ready_for_pickup` status.
- **Out for delivery message**: Shown for delivery orders in `out_for_delivery` status.
- ETA minutes are calculated relative to the current time, never `created_at`.

---

## Status Transition Flow

```
pending → approved (confirmed) → preparing → ready_for_pickup (takeaway) → completed
pending → approved (confirmed) → preparing → out_for_delivery (delivery)  → completed
pending → rejected
pending/approved/preparing → cancelled
```

---

## Security Controls

1. **Authentication**: All admin actions verify `supabase.auth.getUser()`.
2. **Authorization**: Only `owner` or `manager` roles with `is_active = true` can access admin order pages and execute actions.
3. **Status Guard**: Each action validates the current order status before mutation.
4. **Input Sanitization**: Rejection and cancellation reasons are HTML-stripped and trimmed.
5. **ETA Validation**: ETA must be between 1 and 360 minutes.
6. **Customer Privacy**: Public tracking RPC does not expose `admin_notes` or event metadata. Only sanitized rejection/cancellation reasons are shown.
7. **noindex/nofollow**: Customer tracking page has `robots: { index: false, follow: false }`.

---

## Payment Handling

- Completing an order does **not** automatically set `payment_status = 'paid'`.
- Admin must explicitly check the "Confirm payment was received" checkbox in the Complete Order modal.
- If unchecked, `payment_status` remains `'pending'`.

---

## Ready Status Rules

- **Takeaway orders**: `approved/preparing → ready_for_pickup`
- **Delivery orders**: `approved/preparing → out_for_delivery`
- `ready_for_pickup` is **never** used for delivery orders.

---

## ETA Rules

- ETA is calculated as: `estimated_time = now + etaMinutes`
- ETA is **never** calculated from `created_at`.
- Customer tracking page displays both absolute time (around HH:MM) and relative minutes (approximately X minutes from now).
- When ETA has passed, the display shows a red overdue indicator.

---

## Translations

Both Polish (`pl.json`) and English (`en.json`) were updated with:
- `adminOrders.status.*` — nested per-status labels
- `adminOrders.statusHeader` — table column header
- Detail page keys (customerDetails, name, phone, email, etc.)
- ETA display keys (estimatedTime, estimatedTimeAround, estimatedTimeApprox, etc.)
- Ready/en-route messages (readyForPickupMessage, outForDeliveryMessage)

---

## Verification Results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass — 0 errors |
| `npm run lint` | ✅ Pass — 0 warnings, 0 errors |
| `npm run build` | ✅ Pass — 30 static pages, all routes generated |

---

## ESLint Fix: useEffect Dependency Warning

**File**: `components/admin/orders/order-modals.tsx` (ConfirmOrderModal)

**Problem**: `defaultOptions` was computed inline on every render (`const defaultOptions = isDelivery ? [...] : [...]`) and used inside a `useEffect`, but was not in the dependency array. ESLint `react-hooks/exhaustive-deps` flagged it.

**Root cause**: Adding the array directly to deps would cause infinite re-renders because a new array reference is created on every render.

**Fix**: Wrapped `defaultOptions` in `React.useMemo()` keyed on `isDelivery`, then added it to the `useEffect` dependency array. The memoized reference only changes when `orderType` changes, satisfying the linter without causing re-render loops.

```tsx
const defaultOptions = React.useMemo(
  () => (isDelivery ? [30, 40, 50, 60, 75, 90] : [15, 20, 30, 40, 50, 60]),
  [isDelivery]
);

useEffect(() => {
  if (isOpen) {
    setSelectedMins(defaultOptions[2]);
    // ...
  }
}, [isOpen, orderType, defaultOptions]); // defaultOptions now stable
```
