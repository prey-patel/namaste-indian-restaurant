-- Fix profile update security trigger for service_role updates
-- This allows the server-side adminClient (which runs as service_role) to create/update profiles

CREATE OR REPLACE FUNCTION public.check_profile_update_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow superuser (postgres) or service_role to perform administrative bootstrapping/testing/updates
  IF session_user = 'postgres' OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Owner is allowed full updates
  IF public.is_owner() THEN
    RETURN NEW;
  END IF;

  -- Users can only edit their own profiles
  IF auth.uid() IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'You are not allowed to update other profiles.';
  END IF;

  -- Cannot change role or active status
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'You are not allowed to change your own role.';
  END IF;

  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    RAISE EXCEPTION 'You are not allowed to change your active status.';
  END IF;

  RETURN NEW;
END;
$function$;
