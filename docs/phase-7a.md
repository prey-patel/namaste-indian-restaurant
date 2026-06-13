# Phase 7A: Public Order Request Flow

This document details the implementation of the public delivery/takeaway order request flow for Namaste Indian Restaurant.

## 1. Flow Design & Requirements

Customers can browse menu items, build a basket, select order type (takeaway or delivery), fill in contact details, select a payment method, and submit their order request.

### Order Type & Payment Method Alignment
To prevent fraudulent checkout payloads, payment methods are strictly paired with order types:
*   **Takeaway**: Only `cash_on_pickup` and `card_on_pickup` are allowed.
*   **Delivery**: Only `cash_on_delivery` and `card_on_delivery` are allowed.
*   **Server-side Rejection**: Mismatched order/payment methods are rejected by server validation actions (`app/[locale]/(public)/order/actions.ts`).

### Delivery Fee & Final Total Integrity
*   Since distance calculations are unresolved (mocked/unavailable in Phase 7A), the technical fallback delivery fee is stored as `0.00` in the database, but must not mislead the customer.
*   **Basket, Success Page, and Tracking Page**: The delivery fee is presented as **"To Be Confirmed" (Do ustalenia)**. A warning banner shows: *"Delivery fee and availability will be confirmed by the restaurant."*
*   The total is displayed as a **subtotal/estimated amount** only.
*   `0.00 PLN` is never shown as a final delivery fee.

### Scope Restriction
*   All public orders are strictly created in `pending` status.
*   No admin approvals, driver dispatch, ETAs, KDS, online payment integrations, or inventory deductions are included in Phase 7A.

---

## 2. Technical Stack & Implementation

### Zod Validation Schema
Located at [lib/validation/orders.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/lib/validation/orders.ts):
*   Validates customer email, phone, and Polish postal code format (`XX-XXX`).
*   Enforces order type / payment method mapping via Zod `refine`.

### Server Action
Located at [actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/[locale]/(public)/order/actions.ts):
*   Uses `safeParse` to catch validation errors and return translated user-friendly messages.
*   Checks operational status (`delivery_enabled` and `takeaway_enabled`) from database.
*   Checks daily service hours and holiday closures based on `Europe/Warsaw` timezone.
*   Recalculates totals server-side using grosz (cents) integer arithmetic based on [lib/orders/pricing.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/lib/orders/pricing.ts) to prevent client price tampering.
*   Stores orders with a generated secure UUID `token` for tracking.

### Public Order Page & Workflow Component
Located at:
*   [page.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/[locale]/(public)/order/page.tsx)
*   [ordering-workflow-client.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/components/public/order/ordering-workflow-client.tsx)

### Public Tracking Page
Located at [page.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/[locale]/(public)/order/status/page.tsx):
*   Exposed under `/[locale]/order/status?id=UUID&token=UUID`.
*   Includes `noindex, nofollow` meta tags.
*   Fetches masked order details from database using the `get_public_order_details_by_token` RPC.
*   Maps `'approved'` database status to `'confirmed'` status client-side.
*   Displays a status timeline, masked delivery address, and estimated order totals.

---

## 3. QA & Verification

After implementation, validation checks were run successfully:
*   `npm run typecheck`
*   `npm run lint`
*   `npm run build`
