# Transactional Email System QA & Verification Plan

This document details the quality assurance verification scenarios to validate Phase 12A email notifications.

## 1. Local Testing Setup (Mock / Log Mode)

Since local runs usually don't have production Brevo credentials, the system is designed to run in log mode:
- Ensure `EMAIL_ENABLED=false` is set in `.env.local`.
- Check database `email_logs` table after taking actions:
  ```sql
  SELECT status, brevo_message_id, error_message, template_key FROM email_logs;
  ```
  - For `EMAIL_ENABLED=false`, status must be `skipped`.
  - For `EMAIL_ENABLED=true` but missing `BREVO_API_KEY`, status must be `failed` with message `Brevo API key is not configured...`.
  - In both cases, the customer and admin flows must proceed successfully without throwing errors.

## 2. Notification Verification Checklist

### Reservations
1. **Request Received**: Create a public reservation. Verify that `email_logs` records `reservation_request_received_customer` (recipient: customer email, status: skipped/sent) and `reservation_new_admin` (recipient: admin email).
2. **Admin Confirm Link**: Check the generated token link in `reservation_new_admin` log metadata. Open it in a browser.
   - Verify it only displays the first name of the customer, date/time, and guest count.
   - Verify the token is **not** marked as used yet.
   - Click the Confirm button. Verify the status changes to `confirmed` in `reservations` and a `reservation_confirmed_customer` log is created.
   - Re-open the confirmation link. Verify it displays: "Ta akcja została już wykonana lub link wygasł. / This action link was already used or expired."
3. **Admin Reject Link**: Create another reservation. Open the reject token link.
   - Click Confirm Rejection. Verify reservation status becomes `rejected` and a `reservation_rejected_customer` log is created.
4. **Already Processed Check**: Manually approve a reservation from the admin panel. Try to open the email action links for it.
   - Verify it displays: "To żądanie zostało już przetworzone. / This request has already been processed." and doesn't allow double updates.

### Orders
1. **Order Received**: Place a takeaway order. Verify `order_request_received_customer` and `order_new_admin` logs are recorded.
2. **Order Approval with ETA**: Open the approve link from the admin notification.
   - Verify it shows order type, items, and total amount.
   - Select `35 min` and click confirm. Verify order status is `approved`, estimated_time is set, and `order_approved_customer` log is created.
   - Re-open the link and verify it shows the used/expired state.
3. **Order Rejection**: Place another order. Open the reject link.
   - Select a rejection reason and click confirm. Verify order status becomes `rejected`.
4. **Takeaway Ready**: Mark a takeaway order as ready from KDS or admin orders panel. Verify `order_ready_for_pickup_customer` log is created.
5. **Delivery Delivered**: Complete a delivery order. Verify `order_delivered_customer` log is created.
