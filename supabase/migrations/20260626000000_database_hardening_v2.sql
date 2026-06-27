-- Migration: Database Hardening v2
-- Resolves all 21 Supabase Database Linter warnings securely.

-- 1. Fix Mutable Search Path on computed columns
-- Lock down search path for public.id_text(public.orders)
ALTER FUNCTION public.id_text(public.orders) SET search_path = public;

-- 2. Convert non-sensitive trigger and settings functions to SECURITY INVOKER
-- These functions do not query restricted tables and do not need administrative context.
ALTER FUNCTION public.check_delivery_fee_rules_overlap() SECURITY INVOKER;
ALTER FUNCTION public.check_order_total_integrity() SECURITY INVOKER;
ALTER FUNCTION public.check_order_update_permissions() SECURITY INVOKER;
ALTER FUNCTION public.check_profile_update_permissions() SECURITY INVOKER;
ALTER FUNCTION public.check_service_hours_overlap() SECURITY INVOKER;
ALTER FUNCTION public.handle_soft_delete_categories() SECURITY INVOKER;
ALTER FUNCTION public.handle_soft_delete_menu_items() SECURITY INVOKER;
ALTER FUNCTION public.get_public_system_settings() SECURITY INVOKER;

-- 3. Restrict direct public execution on logging and syncing triggers
-- These must remain SECURITY DEFINER to write to protected logs, but PUBLIC does not need execute rights.
REVOKE EXECUTE ON FUNCTION public.log_order_status_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_reservation_status_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_order_public_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_reservation_public_status() FROM PUBLIC, anon, authenticated;

-- 4. Recreate Role Checking Helpers with API RPC runtime protection
-- They remain SECURITY DEFINER to bypass RLS on profiles, but abort immediately if executed via direct PostgREST RPC.

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct API execution via RPC
  IF current_setting('request.path', true) = '/rpc/is_owner' THEN
    RAISE EXCEPTION 'Direct RPC execution is not allowed.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct API execution via RPC
  IF current_setting('request.path', true) = '/rpc/is_manager' THEN
    RAISE EXCEPTION 'Direct RPC execution is not allowed.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_kitchen()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct API execution via RPC
  IF current_setting('request.path', true) = '/rpc/is_kitchen' THEN
    RAISE EXCEPTION 'Direct RPC execution is not allowed.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'kitchen'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct API execution via RPC
  IF current_setting('request.path', true) = '/rpc/is_staff' THEN
    RAISE EXCEPTION 'Direct RPC execution is not allowed.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'staff'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct API execution via RPC
  IF current_setting('request.path', true) = '/rpc/is_admin_or_manager' THEN
    RAISE EXCEPTION 'Direct RPC execution is not allowed.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner'::user_role, 'manager'::user_role) AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct API execution via RPC
  IF current_setting('request.path', true) = '/rpc/has_admin_access' THEN
    RAISE EXCEPTION 'Direct RPC execution is not allowed.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner'::user_role, 'manager'::user_role) AND is_active = true
  );
END;
$$;
