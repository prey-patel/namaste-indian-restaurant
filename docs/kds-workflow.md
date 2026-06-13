# KDS Workflow Documentation

## Order Lifecycle (KDS Perspective)

```
Customer submits order → status: pending
       ↓
Admin confirms order → status: approved (appears in KDS "New" column)
       ↓
Kitchen starts preparing → status: preparing (moves to "Preparing" column)
       ↓
Kitchen marks ready:
  - Takeaway → status: ready_for_pickup (moves to "Ready" column)
  - Delivery → status: out_for_delivery (moves to "Ready" column)
       ↓
Admin completes order → status: completed (disappears from KDS)
```

## KDS Column Mapping

| Column | Statuses Shown | Kitchen Actions Available |
|---|---|---|
| New / Confirmed | `approved` | Start Preparing |
| Preparing | `preparing` | Mark Ready (takeaway) / Handed to Courier (delivery) |
| Ready / Handoff | `ready_for_pickup`, `out_for_delivery` | None (awaiting admin completion) |

## Kitchen Actions

### Start Preparing

- **Trigger**: Kitchen clicks "Start Preparing" on a New/Confirmed order
- **Status change**: `approved` → `preparing`
- **Fields updated**: `status`, `preparing_at`, `updated_at`
- **Effect**: Order moves from "New" column to "Preparing" column

### Mark Ready (Takeaway)

- **Trigger**: Kitchen clicks "Mark Ready" on a Preparing takeaway order
- **Status change**: `preparing` → `ready_for_pickup`
- **Fields updated**: `status`, `ready_at`, `updated_at`
- **Effect**: Order moves to "Ready" column. Customer tracking shows "Ready for pickup"

### Handed to Courier (Delivery)

- **Trigger**: Kitchen clicks "Handed to Courier" on a Preparing delivery order
- **Status change**: `preparing` → `out_for_delivery`
- **Fields updated**: `status`, `dispatched_at`, `updated_at`
- **Effect**: Order moves to "Ready" column. Customer tracking shows "On the way"

## What Kitchen CANNOT Do

- Cannot confirm or reject pending orders (admin only)
- Cannot cancel orders (admin only)
- Cannot complete orders (admin only)
- Cannot modify pricing, totals, or payment status
- Cannot edit customer details
- Cannot add or modify admin notes
- Cannot modify cancellation or rejection reasons

## ETA and Urgency

- Each order card shows elapsed time since approval
- If ETA is set, countdown shows remaining time
- Cards change border color based on urgency:
  - **Gold**: New/confirmed, not urgent
  - **Blue**: Preparing, on schedule
  - **Orange**: Less than 10 minutes remaining
  - **Red**: Less than 5 minutes or overdue
  - **Green**: Ready for handoff

## Sound Alerts

- When a new order with status `approved` appears in the KDS for the first time
- Sound is generated using Web Audio API (no external file)
- Must be enabled by user clicking the sound toggle
- Stored in localStorage as `kds_sound_enabled`
- Visual pulse fallback always works regardless of sound setting
