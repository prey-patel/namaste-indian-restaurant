# Phase 8 — Kitchen Display System (KDS)

## Overview

Phase 8 adds a real-time Kitchen Display System (KDS) to the Namaste Indian Restaurant admin panel. The KDS allows kitchen staff to view confirmed orders, start preparation, and mark orders as ready for pickup or handed to courier — all from a dedicated, kitchen-friendly interface.

## What Phase 8 Includes

- KDS page at `/admin/kds` with server-side auth/role guard
- Kitchen-friendly fullscreen layout (no sidebar/topbar)
- Three-column board: New/Confirmed → Preparing → Ready/Handoff
- Real-time order updates via Supabase Realtime + polling fallback
- Sound alert for new confirmed orders (Web Audio API, user-togglable)
- Visual pulse alert for new orders
- ETA countdown and elapsed time display
- Order type badges (takeaway/delivery)
- Item list with allergens, spice level, and notes
- Start Preparing action (approved → preparing)
- Mark Ready action (preparing → ready_for_pickup for takeaway)
- Handed to Courier action (preparing → out_for_delivery for delivery)
- Connection status indicator (Live / Reconnecting)
- Fullscreen toggle
- Full Polish and English translations
- Accessibility: keyboard navigation, aria labels, reduced motion support

## What Phase 8 Excludes

- No online payment processing
- No inventory deduction or stock management
- No driver tracking or GPS
- No external notifications (SMS, email, Telegram, WhatsApp)
- No printer integration
- No advanced kitchen analytics
- No order completion from KDS (remains in admin order management)
- No database schema changes
- No Phase 9 work

## KDS Visibility Rules

| Order Status | Visible in KDS? |
|---|---|
| `approved` | ✅ Yes — "New / Confirmed" column |
| `preparing` | ✅ Yes — "Preparing" column |
| `ready_for_pickup` | ✅ Yes — "Ready / Handoff" column |
| `out_for_delivery` | ✅ Yes — "Ready / Handoff" column |
| `pending` | ❌ No |
| `rejected` | ❌ No |
| `cancelled` | ❌ No |
| `completed` | ❌ No |
| `delivered` | ❌ No |
| `picked_up` | ❌ No |

## Kitchen Status Transitions

```
approved → preparing (Start Preparing)
preparing → ready_for_pickup (Mark Ready — takeaway only)
preparing → out_for_delivery (Handed to Courier — delivery only)
```

Kitchen does NOT: confirm, reject, cancel, complete, or modify payment.

## Access Control

| Role | KDS Access |
|---|---|
| `owner` | ✅ Full access |
| `manager` | ✅ Full access |
| `kitchen` | ✅ Full access |
| `staff` | ❌ Blocked |
| Public/unauthenticated | ❌ Blocked |

## Files Created

| File | Purpose |
|---|---|
| `app/admin/kds/page.tsx` | KDS server page with auth/role guard |
| `app/admin/kds/actions.ts` | KDS server actions with strict field whitelist |
| `components/admin/kds/kds-board.tsx` | Main KDS board with Realtime + polling |
| `components/admin/kds/kds-order-card.tsx` | Individual order card component |
| `docs/phase-8.md` | This file |
| `docs/kds-workflow.md` | Kitchen workflow documentation |
| `docs/kds-security.md` | Security documentation |
| `docs/kds-realtime.md` | Realtime strategy documentation |
| `docs/kds-qa.md` | QA verification checklist |

## Files Modified

| File | Changes |
|---|---|
| `messages/en.json` | Added `kds` namespace |
| `messages/pl.json` | Added `kds` namespace |
| `components/admin/admin-layout-client.tsx` | Added KDS layout mode (no sidebar/topbar) |
| `app/globals.css` | Added `animate-pulse-once` animation |
