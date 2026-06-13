# Row Level Security (RLS) Policy Guide

This document lists all PostgreSQL Row Level Security (RLS) policies configured in Phase 2.

> [!IMPORTANT]
> RLS policies do not use `OLD` or `NEW` references, which are only valid in database trigger functions. Broad `FOR ALL` policies are split into explicit SELECT, INSERT, UPDATE, and DELETE policies. All public writes are blocked (handled via server actions running as the service-role client).

---

## 1. Helper Functions
Helper functions verify the caller's role by checking `auth.uid()` against the `profiles` table. They run with `SECURITY DEFINER` and search path `public` to prevent search path hijacking.
-   `is_owner()`: Checks if the user is an active owner.
-   `is_manager()`: Checks if the user is an active manager.
-   `is_kitchen()`: Checks if the user is an active kitchen staff member.
-   `is_staff()`: Checks if the user is an active staff member.
-   `is_admin_or_manager()`: Checks if the user is an owner or manager.
-   `has_admin_access()`: Helper alias for admin/manager check.

---

## 2. Table-by-Table Policies

### 1. `profiles`
-   **SELECT:** Users can view their own profile, owners and managers can view all profiles.
-   **INSERT:** Restricted to Owner (or automatic via signup trigger).
-   **UPDATE:** Owner has full edit rights. Users can edit their own profiles (triggers block changing roles or deactivating themselves).
-   **DELETE:** Restricted to Owner.

### 2. `dining_tables`
-   **SELECT:** Owner, Manager, Staff, and Kitchen roles.
-   **INSERT/UPDATE/DELETE:** Restricted to Owner and Manager.

### 3. `reservations`
-   **SELECT/INSERT/UPDATE:** Restricted to Owner, Manager, and Staff. No public direct access. Public tracks reservations via secure RPC token check.
-   **DELETE:** Denied.

### 4. `reservation_status_events`
-   **SELECT:** Restricted to Owner, Manager, and Staff. Public tracking is restricted to the RPC view.
-   **INSERT/UPDATE/DELETE:** Denied. Automatically inserted via database trigger `trg_log_reservation_status_event`.

### 5. `categories` & `menu_items`
-   **SELECT (Public):** Allowed for active and non-deleted categories and items.
-   **SELECT (Admin):** Allowed for all categories and items (Owner, Manager, Staff, Kitchen).
-   **INSERT/UPDATE:** Restricted to Owner and Manager.
-   **DELETE:** Denied. Soft delete is enforced via `is_deleted = true` updates (monitored by triggers).

### 6. `service_hours`, `holiday_closures`, `operational_status`, `site_content`, `delivery_zones`, `delivery_postal_codes`, `delivery_fee_rules`, `packaging_fee_rules`, `menu_item_packaging_rules`
-   **SELECT:** Allowed for public users (website visitors).
-   **INSERT/UPDATE/DELETE:** Restricted to Owner and Manager.

### 7. `system_settings`
-   **SELECT/UPDATE:** Restricted to Owner and Manager. Public settings are read strictly via the `get_public_system_settings()` RPC.
-   **INSERT:** Restricted to Owner.
-   **DELETE:** Denied.

### 8. `contact_inquiries`
-   **SELECT/UPDATE:** Restricted to Owner and Manager. Public inserts are blocked; written on the server side using the service client.
-   **DELETE:** Denied.

### 9. `media_assets`
-   **SELECT (Public):** Allowed only if `is_public = true` and `is_approved = true`.
-   **SELECT (Admin):** Allowed for Owner and Manager.
-   **INSERT/UPDATE/DELETE:** Restricted to Owner and Manager.

### 10. `orders`, `order_items`, `order_charges`
-   **SELECT:** Allowed for Owner, Manager, Staff, and Kitchen.
-   **INSERT:** Allowed for Owner, Manager, and Staff. Public orders are written via server actions.
-   **UPDATE:** Owner, Manager, and Staff can update (staff updates exclude pricing totals and payment fields). Kitchen can update status-related fields (restricted to `preparing`, `ready_for_pickup`, and `completed` status values).
-   **DELETE:** Denied.

### 11. `order_status_events`
-   **SELECT:** Owner, Manager, Staff, and Kitchen.
-   **INSERT/UPDATE/DELETE:** Denied. Auto-logged via trigger on order update.

### 12. `notification_logs`
-   **SELECT/UPDATE:** Restricted to Owner and Manager.
-   **INSERT/DELETE:** Denied.

### 13. `admin_activity_logs`
-   **SELECT:** Owner can select all. Managers can select only their own records.
-   **INSERT/UPDATE/DELETE:** Denied. Added securely using the `log_admin_activity()` RPC.
