-- Migration: Database Hardening and Linter Warnings Remediation
-- Fixes mutable search paths (setting search_path = public) and revokes public execution rights for 23 security-sensitive functions.

-- 1. Fix mutable search paths
ALTER FUNCTION public.trigger_set_timestamp() SET search_path = public;
ALTER FUNCTION public.get_public_system_settings() SET search_path = public;

-- 2. Revoke execute privileges from PUBLIC, anon, and authenticated roles for security definer functions to prevent direct RPC execution and resolve linter warnings.
-- All client-side queries will use server-side Next.js server actions / components that run under the service_role (adminClient) context.

REVOKE EXECUTE ON FUNCTION public.check_delivery_fee_rules_overlap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_order_total_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_order_update_permissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_profile_update_permissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_service_hours_overlap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_order_details_by_token(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_reservation_status_by_token(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_system_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_soft_delete_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_soft_delete_menu_items() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_admin_access() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_kitchen() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_manager() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_activity(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_reservation_status_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_order_public_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_reservation_public_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_kds_order_status(uuid, order_status) FROM PUBLIC, anon, authenticated;

-- Ensure service_role still has explicit execute rights for functions that are called via server-side RPCs
GRANT EXECUTE ON FUNCTION public.get_public_order_details_by_token(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_reservation_status_by_token(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO service_role;
