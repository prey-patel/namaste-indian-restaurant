# Phase 11A: Admin Settings Module

The Admin Settings module allows authenticated Owner and Manager accounts to configure the core operational parameters of the restaurant directly from the admin interface.

## System Components

### 1. Unified Management UI (`app/admin/settings/settings-client.tsx`)
- Tabbed workspace style matching the premium admin theme.
- Interactive tab panels for:
  - **Restaurant Profile**: Display names, contact details, description, and external URLs.
  - **Operational Status**: Turn dining, deliveries, takeaway, and reservations on/off instantly.
  - **Opening Hours**: Daily time windows for dine-in, takeaway, and delivery services.
  - **Reservation Rules**: Maximum guest counts, lead times, and scheduling bounds.
  - **Delivery Zones**: Dynamic radius caps and minimum order requirements.
  - **Charges & Fees**: Packaging surcharges.
  - **Holiday Closures**: Grid management of active temporary and calendar closure events.
  - **Language & Region**: Read-only settings describing Warsaw timezone, PLN currency, and localization parameters.
  - **Security & Access**: Detailed explanation of privilege scopes, RLS database layers, and audit logging.

### 2. Secure Server API (`app/admin/settings/actions.ts`)
- Implements Next.js server actions validating inputs via Zod.
- Strictly validates caller identity and authorization (`owner` or `manager`) before applying updates.
- Invalidates and revalidates all affected Next.js routes dynamically on successful writes to ensure updates propagate immediately.

### 3. Server Loader (`app/admin/settings/page.tsx`)
- Securely restricts access to active Owner and Manager roles.
- Performs parallel database loading across all 7 operational tables.
