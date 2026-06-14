# Settings Live Synchronization

Any setting changed in the Admin Settings panel affects the public-facing website and server-side validation immediately. This is accomplished using a combination of dynamic queries, Server Action revalidation, and database constraints.

## Synchronization Mechanics

### 1. Cache Revalidation
Inside [actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/admin/settings/actions.ts), every successful database update executes the `revalidateAllPaths()` helper:
```typescript
function revalidateAllPaths() {
  const paths = [
    '/',
    '/pl',
    '/en',
    '/pl/contact',
    '/en/contact',
    '/pl/reservations',
    '/en/reservations',
    '/pl/order',
    '/en/order',
    '/admin',
    '/admin/settings'
  ];
  for (const p of paths) {
    revalidatePath(p);
  }
}
```
This forces Next.js to immediately purge the static rendering cache for all localized public routes, causing the next page request to generate with the updated database values.

### 2. Immediate Server Action Enforcement
Server actions executing reservations and order submits read values directly from the database at invocation time:
- **Reservation Guest Limits**: [reservations/actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/reservations/actions.ts) queries `system_settings` for `reservation_max_guests` on every submit.
- **Operational Availability**: [order/actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/order/actions.ts) loads `operational_status` to verify if delivery/takeaway is enabled.
- **Holiday Closures**: Both actions query the `holiday_closures` table using the target transaction date to block requests immediately on closed dates.
- **Service Hours**: Both actions verify if the submission falls within the active operational time window configured in the `service_hours` table for the respective day of the week.

### 3. Dynamic UI Updates
- **Reservation Page**: [reservations/page.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/reservations/page.tsx) reads settings dynamically, updating the reservation policy text (guest caps and phone number) in Polish/English, and configures the dropdown options in `ReservationForm` dynamically.
- **Order Page**: [order/page.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/%5Blocale%5D/%28public%29/order/page.tsx) dynamically loads contact info, passing it to `OrderingWorkflowClient`.
- **Global Footer**: Loaded dynamically, mapping the address, brand name, and telephone numbers to system settings.
