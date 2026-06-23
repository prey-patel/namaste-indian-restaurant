-- Migration: Restore Execute Privileges for RLS and Trigger Functions
-- Resolves "Unauthorized: Admin profile not found" errors by restoring EXECUTE rights to authenticated and anon roles.

-- 1. Restore execute privileges to authenticated and anon roles for database role checking helper functions (required for RLS policies to evaluate successfully)
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_kitchen() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_access() TO anon, authenticated;

-- 2. Restore execute privileges to authenticated and anon roles for trigger/validation functions to prevent any execution privilege errors during write operations
GRANT EXECUTE ON FUNCTION public.check_delivery_fee_rules_overlap() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_order_total_integrity() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_order_update_permissions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_profile_update_permissions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_service_hours_overlap() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_soft_delete_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_soft_delete_menu_items() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_order_status_event() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_reservation_status_event() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_order_public_status() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_reservation_public_status() TO anon, authenticated;

-- 3. Restore execute privileges for public system settings RPC
GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO anon, authenticated;
