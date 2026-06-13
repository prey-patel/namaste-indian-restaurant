# KDS Database Trigger & Permissions Audit

This document details the database-level security constraints, function updates, and role-based permissions applied for the Kitchen Display System (KDS) transition validation.

---

## 1. Exact Function & Trigger Details

* **Database Function**: `public.check_order_update_permissions()` (defined as `SECURITY DEFINER` under schema `public`).
* **Database Trigger**: `trg_check_order_update_permissions`
  * **Event**: `BEFORE UPDATE ON public.orders`
  * **Execution**: `FOR EACH ROW EXECUTE FUNCTION check_order_update_permissions()`
* **Target Migration File**: [20260613000000_phase_2_backend_foundation.sql](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/supabase/migrations/20260613000000_phase_2_backend_foundation.sql)

---

## 2. Before / After Permission Behavior

### Before Update
When a user with the `kitchen` role tried to mark a delivery order as handed to a courier, the server action updated the status to `out_for_delivery`. The database trigger checked:
```sql
IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('preparing'::order_status, 'ready_for_pickup'::order_status, 'completed'::order_status) THEN
  RAISE EXCEPTION 'Kitchen staff is not allowed to transition order status to %.', NEW.status;
END IF;
```
Since `out_for_delivery` was not in that list, the database rejected the write and threw a `P0001` exception, preventing the status change.

### After Update
The whitelist inside the trigger was expanded to include `out_for_delivery`:
```sql
IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('preparing'::order_status, 'ready_for_pickup'::order_status, 'out_for_delivery'::order_status, 'completed'::order_status) THEN
  RAISE EXCEPTION 'Kitchen staff is not allowed to transition order status to %.', NEW.status;
END IF;
```
Kitchen staff can now transition delivery orders to `out_for_delivery` (displayed in UI as "Handed to Courier") and takeaway orders to `ready_for_pickup` (displayed in UI as "Mark Ready").

---

## 3. Strict Write Whitelisting (Database Level)

The trigger strictly enforces that if the database user has the `kitchen` role (`public.is_kitchen()`), they **cannot** alter any pricing, payment, or customer parameters.

### Whitelisted Fields
Kitchen can only alter status and timestamp fields:
- `status`
- `preparing_at`
- `ready_at`
- `dispatched_at`
- `updated_at`

### Blocked Fields
The trigger checks if any of the following fields are modified, and throws `Kitchen staff is only allowed to update order status fields.` if they differ:
- `customer_name` / `customer_phone` / `customer_email` / `customer_notes`
- `order_type`
- `delivery_address` / `delivery_postal_code` / `delivery_city` / `delivery_latitude` / `delivery_longitude`
- `route_distance_km` / `route_duration_car_minutes` / `route_duration_walk_minutes` / `route_provider`
- `geocoding_status` / `geocoding_error` / `address_verified_at`
- `items_subtotal` / `delivery_fee` / `packaging_total` / `other_charges_total` / `discount_total` / `total_amount`
- `payment_status` / `payment_method`
- `token` / `idempotency_key` / `customer_language`
- `admin_notes` / `created_by_admin_id` / `created_at`

---

## 4. Kitchen Order Completion Constraints

While `'completed'::order_status` is whitelisted in the database trigger to allow eventual lifecycle updates, the kitchen **cannot** complete orders due to the following application-level boundaries:
1. **Server Action Protection**: The KDS server actions (`app/admin/kds/actions.ts`) do **not** export or implement a complete action. The only actions defined are:
   - `kdsStartPreparingAction` (updates status to `preparing`)
   - `kdsMarkReadyAction` (updates status to `ready_for_pickup` or `out_for_delivery`)
2. **UI Limitation**: No "Complete" button is rendered on `kds-order-card.tsx` or `kds-board.tsx`. The order moves to the **Ready / Handoff** column and sits there until completed by the owner/manager.
3. **Admin Dashboard Separation**: Order completion remains exclusively within the Admin Order Management panel (`app/admin/orders/[id]`), requiring manual verification of payment.

---

## 5. Live DB Update & Migration Plan

### Local DB Status
The update has been **fully applied and verified** on the local/development database using the `postgres` superuser credentials. The automated end-to-end integration test successfully confirmed that takeaway and delivery workflows function properly without trigger exceptions.

### Staging / Production Migration Plan

To roll out this update to staging and production environments:

1. **New Deployments**: 
   Since the change is saved directly inside the baseline migration file `20260613000000_phase_2_backend_foundation.sql`, any new database setup or schema replication will naturally compile with the correct function definition.

2. **Existing Deployments (Hotfix)**:
   For environments that already contain active database tables and records:
   - Run the DDL hotfix to replace the function definition in-place without rebuilding tables:
     ```sql
     CREATE OR REPLACE FUNCTION public.check_order_update_permissions()
     RETURNS TRIGGER
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $$
     BEGIN
       IF public.is_kitchen() THEN
         -- (whitelist validations check)
         IF OLD.customer_name IS DISTINCT FROM NEW.customer_name OR ... THEN
           RAISE EXCEPTION 'Kitchen staff is only allowed to update order status fields.';
         END IF;

         -- Include out_for_delivery
         IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('preparing'::order_status, 'ready_for_pickup'::order_status, 'out_for_delivery'::order_status, 'completed'::order_status) THEN
           RAISE EXCEPTION 'Kitchen staff is not allowed to transition order status to %.', NEW.status;
         END IF;
       END IF;

       -- (staff validations check)
       RETURN NEW;
     END;
     $$;
     ```
   - This script can be run through the Supabase Dashboard SQL Editor or deployed using a new migration file via the CLI (`supabase db push`).
