# Email Notification Matrix

This document defines the transactional emails sent by the Namaste Indian Restaurant platform, categorizing triggers, recipients, and localization.

## 1. Reservations

| Trigger Event | Recipient | Language | Template Key | Description |
|---|---|---|---|---|
| Customer submits reservation request | Customer | Customer Preferred (PL/EN) | `reservation_request_received_customer` | Confirmation that the request was received and is pending admin approval. |
| Customer submits reservation request | Admin | English | `reservation_new_admin` | Alert to administrator with secure click-to-approve/reject links. |
| Admin approves reservation | Customer | Customer Preferred (PL/EN) | `reservation_confirmed_customer` | Confirmation that reservation is confirmed. Includes table number if assigned. |
| Admin rejects reservation | Customer | Customer Preferred (PL/EN) | `reservation_rejected_customer` | Rejection notification with optional rejection reason. |
| Admin cancels reservation | Customer | Customer Preferred (PL/EN) | `reservation_cancelled_customer` | Cancellation notification with cancellation reason. |

## 2. Orders

| Trigger Event | Recipient | Language | Template Key | Description |
|---|---|---|---|---|
| Customer submits order request | Customer | Customer Preferred (PL/EN) | `order_request_received_customer` | Confirmation that order was received and is pending admin approval. |
| Customer submits order request | Admin | English | `order_new_admin` | Alert to administrator with order details and secure action links. |
| Admin approves order | Customer | Customer Preferred (PL/EN) | `order_approved_customer` | Notification that order is approved, including calculated preparation ETA. |
| Admin rejects order | Customer | Customer Preferred (PL/EN) | `order_rejected_customer` | Rejection notification with optional rejection reason. |
| Takeaway order marked ready | Customer | Customer Preferred (PL/EN) | `order_ready_for_pickup_customer` | Alerts takeaway customer that their food is ready for pickup. |
| Delivery order marked completed | Customer | Customer Preferred (PL/EN) | `order_delivered_customer` | Sent only when delivery orders are finalized/marked as completed. |

## 3. Excluded Scenarios

To avoid spam and keep transactional email deliverability high, the following events do **NOT** trigger emails:
- Kitchen/KDS starting preparation status (`preparing`)
- Delivery dispatch status (`out_for_delivery`)
- Staff roles or admin profile edits
- In-store KDS internal updates
