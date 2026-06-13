# KDS Security & Access Control

This document outlines the security architecture, data privacy measures, and role-based permissions implemented for the Kitchen Display System (KDS) in Phase 8.

---

## 1. Multi-Layer Access Control

The KDS security model is structured in multiple defense-in-depth layers:

```
[ Client Request ]
       ↓
[ 1. Route Guard (Server Page) ] — Redirects public & staff to login/dashboard
       ↓
[ 2. Action Guard (Server Action) ] — Re-validates session + role on every mutation
       ↓
[ 3. Whitelist Filter ] — Limits mutable columns to status and timestamps
       ↓
[ 4. Database RLS Policies ] — Restricts PostgreSQL UPDATE operations by role
```

### Layer 1: Route-Level Protection (`app/admin/kds/page.tsx`)
When a user requests the KDS page, the server-side code performs an authentication and profile role check before rendering any data:
- Must have a valid session in Supabase.
- Must have an active profile (`is_active = true`).
- Must belong to one of the authorized kitchen roles: `owner`, `manager`, or `kitchen`.
- **Staff and public users are blocked** and redirected back to the login page or the admin dashboard root.

### Layer 2: Action-Level Protection (`app/admin/kds/actions.ts`)
Even if a user bypasses client-side routing, all state transitions are performed via Next.js Server Actions. Every action invokes `validateKdsAccess()` which:
1. Re-fetches the current authenticated user from `supabase.auth.getUser()`.
2. Inspects their live database profile to confirm they are active.
3. Checks if the role is whitelisted (`owner`, `manager`, or `kitchen`).
4. Throws a hard server exception if validation fails, blocking the execution of any SQL query.

---

## 2. Strict Whitelisting (SQL Mutations)

Kitchen staff should not have the ability to alter financial records, customer info, or order parameters. The server actions strictly control which fields are modified in the database.

| Action | Allowed Fields to Update | Blocked Fields |
|---|---|---|
| **Start Preparing** | `status`, `preparing_at`, `updated_at` | `price`, `total`, `customer_name`, `payment_status`, `admin_notes` |
| **Mark Ready / Handed to Courier** | `status`, `ready_at` (takeaway), `dispatched_at` (delivery), `updated_at` | `price`, `total`, `customer_name`, `payment_status`, `admin_notes` |

The update queries explicitly structure the payload to prevent broad dictionary updates:
```typescript
// Example from actions.ts
await supabase
  .from('orders')
  .update({
    status: 'preparing',
    preparing_at: now,
    updated_at: now
  })
  .eq('id', orderId);
```

---

## 3. Data Minimization (Customer Privacy)

KDS screens in a kitchen are often visible to multiple people (cooks, kitchen helpers, couriers, or visiting suppliers). To prevent exposing customer Personally Identifiable Information (PII), the KDS query enforces data minimization:

1. **First Name Only**: The page splits the full customer name and exposes only the first word (first name) to the frontend component:
   ```typescript
   customer_first_name: order.customer_name ? order.customer_name.split(' ')[0] : ''
   ```
2. **Omitted Fields**: The database query specifically does **not** select:
   - Customer phone number (`customer_phone`)
   - Customer email address (`customer_email`)
   - Delivery address details (`delivery_street`, `delivery_city`, etc.)
   - Admin internal notes (`admin_notes`)
   This prevents any accidental disclosure of sensitive contact details or internal customer reviews on the kitchen screen.

---

## 4. Database RLS Policies

Database-level security is enforced via PostgreSQL Row Level Security (RLS) policies defined in `supabase/migrations/20260613000000_phase_2_backend_foundation.sql`:

### Select Policy (`select_orders`)
Allows `owner`, `manager`, `staff`, and `kitchen` to read orders:
```sql
CREATE POLICY select_orders ON orders
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());
```

### Kitchen Update Policy (`update_orders_kitchen`)
Restricts kitchen update permissions based on the `is_kitchen()` security definer function:
```sql
CREATE POLICY update_orders_kitchen ON orders
    FOR UPDATE TO authenticated
    USING (public.is_kitchen())
    WITH CHECK (public.is_kitchen());
```

### Admin/Manager Update Policy (`update_orders_admin`)
Allows full admin edits for owners, managers, and staff:
```sql
CREATE POLICY update_orders_admin ON orders
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff())
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());
```

*Note: Kitchen profiles are restricted by RLS from modifying fields they shouldn't, matching the server action whitelisting logic.*
