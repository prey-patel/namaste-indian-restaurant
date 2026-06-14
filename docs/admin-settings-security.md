# Admin Settings Security and Access Control

To protect critical system configuration, security is enforced at both the API layer (Next.js server actions) and the database layer (PostgreSQL RLS policies and restricted RPC key exposure).

## Security Layers

### 1. Public-Safe RPC (`get_public_system_settings`)
Anonymous users are blocked from querying the `system_settings` table directly. Public clients fetch safe configurations strictly via the `get_public_system_settings()` database function.
- **Whitelist Enforcement**: The function is hardcoded to return only customer-safe, public-facing settings:
  ```sql
  WHERE s.key IN (
      'restaurant_address',
      'restaurant_phone',
      'timezone',
      'site_url',
      'coordinates',
      'opening_status',
      'public_messages',
      'public_service_hours',
      'restaurant_name',
      'public_display_name',
      'restaurant_email',
      'google_maps_link',
      'short_description',
      'restaurant_city',
      'restaurant_postal_code',
      'restaurant_country',
      'reservation_max_guests',
      'reservation_min_lead_time_hours',
      'reservation_max_days_ahead',
      'reservation_contact_instructions'
  )
  ```
- **Internal Keys Filtered**: Private or administrative settings (such as encryption keys, payment provider secrets, or internal integrations) are excluded from the whitelist.

### 2. Server Action Role Authentication
All settings modification actions in [actions.ts](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/app/admin/settings/actions.ts) run through `verifyAuth()`:
1. **User Identity check**: Authenticates the active session token using `supabase.auth.getUser()`.
2. **Role Verification**: Queries the `profiles` table to verify that the logged-in user is `is_active` and holds either the `owner` or `manager` role.
3. If validation fails, the action immediately aborts throwing an unauthorized error.

### 3. Database Row-Level Security (RLS)
The database tables are locked with standard RLS policies:
- **`system_settings`**: `SELECT` is restricted to authorized roles (`owner` and `manager`), while public reads go through the secure RPC. Write access (`INSERT`/`UPDATE`) is locked to administrative roles.
- **`service_hours`**, `operational_status`, `holiday_closures`, `delivery_zones`, `delivery_fee_rules`, `packaging_fee_rules`: Only `owner` and `manager` roles can write to these tables.
