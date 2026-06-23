-- Migration: Profiles Delete Cascade and Set Null
-- Updates foreign keys referencing public.profiles(id) to ON DELETE SET NULL, allowing administrator users to be deleted cleanly.

-- 1. categories
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_deleted_by_fkey;
ALTER TABLE public.categories ADD CONSTRAINT categories_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. menu_items
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_deleted_by_fkey;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. service_hours
ALTER TABLE public.service_hours DROP CONSTRAINT IF EXISTS service_hours_updated_by_fkey;
ALTER TABLE public.service_hours ADD CONSTRAINT service_hours_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. holiday_closures
ALTER TABLE public.holiday_closures DROP CONSTRAINT IF EXISTS holiday_closures_updated_by_fkey;
ALTER TABLE public.holiday_closures ADD CONSTRAINT holiday_closures_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. operational_status
ALTER TABLE public.operational_status DROP CONSTRAINT IF EXISTS operational_status_updated_by_fkey;
ALTER TABLE public.operational_status ADD CONSTRAINT operational_status_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. system_settings
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7. site_content
ALTER TABLE public.site_content DROP CONSTRAINT IF EXISTS site_content_updated_by_fkey;
ALTER TABLE public.site_content ADD CONSTRAINT site_content_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 8. media_assets
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_uploaded_by_fkey;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 9. delivery_fee_rules
ALTER TABLE public.delivery_fee_rules DROP CONSTRAINT IF EXISTS delivery_fee_rules_updated_by_fkey;
ALTER TABLE public.delivery_fee_rules ADD CONSTRAINT delivery_fee_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 10. packaging_fee_rules
ALTER TABLE public.packaging_fee_rules DROP CONSTRAINT IF EXISTS packaging_fee_rules_updated_by_fkey;
ALTER TABLE public.packaging_fee_rules ADD CONSTRAINT packaging_fee_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
