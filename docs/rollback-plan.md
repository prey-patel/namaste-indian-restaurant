# Production Rollback Plan

This runbook outlines the steps to revert code deployments and database migrations in the event of a critical failure.

---

## 1. Database Rollback Actions

If database migrations cause issues or throw errors:

### A. Reverting the KDS Trigger Change
To revert the trigger permissions back to the baseline behavior (where `out_for_delivery` was blocked for kitchen staff), run the following SQL:
```sql
CREATE OR REPLACE FUNCTION public.check_order_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_kitchen() THEN
    -- (Standard whitelists...)
    -- Restore original whitelist (exclude out_for_delivery)
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('preparing'::order_status, 'ready_for_pickup'::order_status, 'completed'::order_status) THEN
      RAISE EXCEPTION 'Kitchen staff is not allowed to transition order status to %.', NEW.status;
    END IF;
  END IF;

  IF public.is_staff() THEN
    -- (Standard staff checks...)
  END IF;

  RETURN NEW;
END;
$$;
```

### B. Reverting the Rate Limiting Table
If the `rate_limits` table causes locks or system failures, drop the table to remove it:
```sql
DROP TABLE IF EXISTS public.rate_limits CASCADE;
```
*Note: Because server actions wrap `isRateLimited` inside try-catch blocks and are designed to fail-closed, dropping the table will cause subsequent actions to return rate-limit boundaries. Restore the in-memory maps or temporary code configurations quickly.*

---

## 2. Vercel Code Rollback

If the application bundle crashes:
1. Open the **Vercel Dashboard** for the project.
2. Navigate to the **Deployments** tab.
3. Locate the previous successful deployment (e.g. the one prior to the Phase 9 build).
4. Click the **ellipsis (...)** icon on the right side of the deployment card.
5. Click **Redeploy** or select **Promote to Production**.
6. Vercel will route all domain traffic to the stable build within 10 seconds.

---

## 3. Environment Variable Recovery

If environment variable updates break functionality:
1. Re-open the Vercel project **Settings** → **Environment Variables**.
2. Restore any deleted variables or revert values to their previous backups.
3. Trigger a redeploy of the current build to apply the configuration values.
