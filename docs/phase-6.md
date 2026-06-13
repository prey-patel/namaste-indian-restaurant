# Phase 6 Documentation — Reservation System

This document outlines the architecture, security models, validation schemas, and workflow operations of the Namaste Indian Restaurant Reservation System implemented in Phase 6.

---

## 1. Core Architecture

The reservation system is divided into public client interfaces (for table requests and tracking status) and administrative dashboards (for verification and manual status transitions).

```
[Public Client]
  │
  ├──► GET /reservations ────────────────────────► submits form
  │      │
  │      └──► Server Action (public/actions.ts) ──► Zod, rate-limit, open hours check
  │             │
  │             └──► INSERT into reservations (status = 'pending')
  │
  └──► GET /reservations/status?id=...&token=... ──► public status query (SEO masked)
         │
         └──► database function RPC ─────────────► SELECT safe columns only

[Admin Portal]
  │
  └──► GET /admin/reservations ──────────────────► list all bookings with filters
         │
         └──► Server Action (admin/actions.ts) ──► Confirm, Reject, Cancel, Complete, No-Show
                                                  and manual dining table assignment
```

---

## 2. Reservation Status Workflow

Reservations strictly transition through a manually operated state machine. Automatic table allocations or status confirmations are intentionally disabled to allow human operational control.

### Valid Reservation Statuses:
- **`pending`**: All public bookings start here. Represents an unverified request.
- **`confirmed`**: The request is verified, and a table is successfully assigned to the party.
- **`rejected`**: The request is declined (e.g. lack of availability/capacity), and a reason is stored.
- **`cancelled`**: A previously confirmed or pending reservation is retracted.
- **`completed`**: The guest successfully visited the restaurant.
- **`no_show`**: The guest failed to attend their reservation.

> [!IMPORTANT]
> The reservation status `approved` is completely excluded from the application, dictionaries, and code. The correct enum value is `confirmed`.

### Database Triggers:
The PostgreSQL trigger `trg_log_reservation_status_event` automatically catches all INSERT and UPDATE operations on the `reservations` table and inserts a corresponding audit log row inside `reservation_status_events`. This ensures that a complete, reliable, and immutable history of status transitions is kept.

---

## 3. Public Table Reservation Form
- **Route**: `app/[locale]/(public)/reservations/page.tsx`
- **Fields**: Name, Email, Phone, Date, Time, Guest Count (1 to 20), Occasion (optional), Customer Notes (optional), and Consent Checkbox.
- **Validation**: Strict Zod validation schemas (`lib/validation/reservations.ts`). Checks if:
  - Phone format is valid.
  - Guests count is an integer between 1 and 20.
  - Requested date is not in the past.
  - Customer notes do not exceed 500 characters and contain no HTML tags.
- **Operational Integration**: Queries operational status (`operational_status.reservations_enabled`), holiday closures (`holiday_closures`), and service hours (`service_hours`) for the target day of the week before inserting to ensure requests are within open hours.

---

## 4. Public Status Tracking Screen
- **Route**: `app/[locale]/(public)/reservations/status/page.tsx`
- **SEO Protection**: Protected via Next.js robots configuration (`noindex, nofollow`). Excluded from sitemaps and search engines.
- **Data Protection**: Calls the database function `get_public_reservation_status_by_token(res_id, sec_token)` to retrieve only customer-safe fields. Sensitive database attributes (e.g., email address, phone number, client IP hash, admin notes) are never exposed.
- **Error Handling**: If the ID and token do not match an existing reservation, a generic "Reservation Not Found" message is rendered to prevent ID enumerations.

---

## 5. Admin Reservations Management Panel
- **Route**: `app/admin/reservations/page.tsx`
- **Interactive Component**: `components/admin/reservations/reservations-dashboard.tsx`
- **Overview Metrics**:
  - *Pending Bookings*: All active bookings requiring attention.
  - *Confirmed Today*: Count of bookings confirmed for the current date.
  - *Upcoming Total*: Total confirmed bookings starting in the future.
  - *Cancelled / Rejected*: Historical count of inactive bookings.
- **Filtering**: Live filtering by search query (customer name, email, phone), booking status, and reservation date.
- **Manual Table Assignment**: Allows selecting an active dining table from `dining_tables`. Enforces capacity checks (`dining_tables.capacity >= reservations.guests_count`) and table active status on assignment.

---

## 6. Security Controls

### IP Rate Limiting:
Uses a HMAC-SHA256 hashed signature of the client's IP peppered with `RESERVATION_IP_HASH_SECRET` to prevent database flooding. Raw client IPs are never written to the server's logs or database. Rate limits submissions to a maximum of 3 requests per hour per unique IP hash.

### Role Authorization:
All status mutations verify that the session user profile exists in `profiles`, has an active state (`is_active = true`), and possesses either the `'owner'` or `'manager'` role. Non-privileged roles (such as staff, kitchen, or public clients) are rejected with an unauthorized error.
