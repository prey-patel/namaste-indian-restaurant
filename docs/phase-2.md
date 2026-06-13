# Phase 2 Documentation - Database & Security Foundation

This document details the database architecture, security systems, and verification results for **Phase 2** of the Namaste Indian Restaurant backend foundation.

---

## 1. Summary of Changes in Phase 2

We have created the SQL migration script and verification suite to set up a secure, production-ready Supabase backend.
-   **No destructive migrations:** Created the setup in a sequential, clean order.
-   **Defense-in-depth triggers:** Implemented database triggers to validate service hours, delivery distance bands, order total calculations, soft-delete mechanisms, and role-based update privileges.
-   **Token-based secure RPC tracking:** Expose public-safe status check views that mask PII (such as exact delivery addresses).
-   **Option B (Private Storage):** Switched storage image buckets (`menu-images`, `site-images`, `gallery-images`) to private, with read operations going through RLS checks that verify media assets approval.

---

## 2. Table and Enum List

### Enum Types
1.  `user_role`: `'owner'`, `'manager'`, `'kitchen'`, `'staff'`
2.  `reservation_status`: `'pending'`, `'confirmed'`, `'rejected'`, `'cancelled'`, `'completed'`, `'no_show'`
3.  `reservation_source`: `'website'`, `'phone'`, `'walk_in'`, `'admin'`
4.  `service_hours_type`: `'dine_in'`, `'reservations'`, `'delivery'`, `'takeaway'`
5.  `affected_service_type`: `'all'`, `'dine_in'`, `'reservations'`, `'delivery'`, `'takeaway'`
6.  `inquiry_status`: `'new'`, `'read'`, `'replied'`, `'archived'`
7.  `order_type`: `'delivery'`, `'takeaway'`
8.  `order_status`: `'pending'`, `'approved'`, `'preparing'`, `'out_for_delivery'`, `'delivered'`, `'ready_for_pickup'`, `'picked_up'`, `'completed'`, `'rejected'`, `'cancelled'`
9.  `payment_status`: `'pending'`, `'paid'`, `'failed'`
10. `payment_method`: `'cash_on_delivery'`, `'cash_on_pickup'`, `'card_on_delivery'`, `'card_on_pickup'`
11. `packaging_fee_type`: `'food_container'`, `'beverage_cup'`, `'bag'`, `'custom'`
12. `charge_type`: `'delivery_fee'`, `'packaging_fee'`, `'service_fee'`, `'discount'`, `'manual_adjustment'`
13. `notification_channel`: `'brevo'`, `'telegram'`
14. `notification_status`: `'pending'`, `'sent'`, `'failed'`, `'retrying'`
15. `geocoding_status_type`: `'pending'`, `'success'`, `'failed'`, `'manually_corrected'`
16. `rule_action_type`: `'allow'`, `'contact_restaurant'`, `'block'`

### Database Tables (24 Tables)
Refer to [docs/database-schema.md](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/docs/database-schema.md) for individual column listings.

---

## 3. RLS Policies and RPC Summary

All direct table modifications by public users are denied. Direct database communication uses authenticated sessions where roles are checked using database-level helper functions.

-   **Public Settings:** Direct reading of the `system_settings` table is blocked. Public users request settings through `get_public_system_settings()` which returns only safe keys.
-   **Order Tracking:** Public orders can be tracked only via `get_public_order_details_by_token(ord_id, sec_token)` which verifies tokens, returns snapshotted items, and masks the street address (e.g. `split_part` of address + `**` to keep the street name and city while hiding exact house/apartment numbers).
-   **KDS Updates:** Kitchen users cannot change order pricing, customer details, or payment methods. They update status using `update_kds_order_status(ord_id, new_status)` which restricts KDS state transitions.
-   **Activity Logs:** Owner role has SELECT access to all logs. Managers can SELECT only their own activity logs. UPDATE/DELETE are blocked.

---

## 4. Owner Bootstrap Steps

To securely initialize the owner admin without exposing passwords or keys:
1.  **Disable Self-Signup:** In Supabase Dashboard -> Auth -> Providers -> Email, disable signup.
2.  **Create Auth User:** Go to Auth -> Users -> Add User -> Create User. Enter the owner's email and a secure password. Keep confirmation enabled.
3.  **Find UID:** Copy the generated `User UID` from the dashboard.
4.  **Promote to Owner:** Execute the following SQL statement in the SQL Editor:
    ```sql
    UPDATE public.profiles
    SET role = 'owner'::user_role,
        is_active = true,
        full_name = 'Owner Name'
    WHERE id = 'USER_UID';
    ```

---

## 5. Storage Buckets and Security Policies

We implemented **Option B (Private Buckets)**:
-   Buckets `menu-images`, `site-images`, and `gallery-images` are private.
-   Public can SELECT files only if a matching database record exists in `media_assets` with `is_approved = true` and `is_public = true`.
-   Upload/Update/Delete permissions are restricted strictly to Owner and Manager roles.
-   SVG file uploads are blocked (svg mimetype denied) and maximum size is restricted to 5MB. Server-side upload functions in later phases will enforce sanitization and size checks.

---

## 6. What Belongs to Phase 3 Next

Phase 3 transitions to the **Frontend Design System and Layout**:
-   Define Tailwind custom Gold/Navy colors, typography pairings, and layout containers.
-   Implement the shared translation-aware Header, Language Switcher (PL/EN), and Footer.
-   Configure Framer Motion page transition wrapper.
-   No database writes or page layouts for subpages are started yet.
