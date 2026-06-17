# QA & Verification Guide — Delivery Distance calculations

This guide describes testing scenarios for validating geocoding and routing calculations.

## Verification Checklist

### 1. Website Public Checkout
- Submit an order with a valid Ciechanów address (e.g. `ul. Warszawska 10, 06-400 Ciechanów`).
- Confirm the order is created in the `pending` state.
- Inspect the database or admin dashboard to verify coordinates, car/walking routes, and geocoded address are calculated and stored.

### 2. Incomplete/Invalid Addresses
- Submit an order with an invalid or incomplete address (e.g. `xyz987`).
- Confirm that the order creation does *not* crash and completes successfully.
- Verify that the geocoding status is set to `'failed'`, and `delivery_distance_error` contains the provider failure message.
- Verify the admin dashboard displays: *"Distance unavailable — verify address manually."* instead of 0 values.

### 3. Takeaway Exclusion
- Submit a takeaway order.
- Verify that no geocoding or routing APIs are called and that the database coordinates/distance fields remain `null`.

### 4. Admin Manual Orders
- Create a manual delivery order from `/admin/orders/new`.
- Verify the distance calculation runs after submission.
- Ensure the admin can manually confirm and adjust the delivery fee during creation or approval.

### 5. Restaurant Address Updates
- Edit the restaurant address in settings.
- Verify `system_settings.coordinates` changes to `'unverified'`.
- Verify the next delivery order submission successfully triggers re-geocoding, saving the new coordinates to settings.
