-- Migration: Add fields for delivery distance and routing calculations
-- Phase 13B

-- 1. Alter existing coordinates types to numeric(10,7) for finer precision
ALTER TABLE public.orders ALTER COLUMN delivery_latitude TYPE numeric(10,7);
ALTER TABLE public.orders ALTER COLUMN delivery_longitude TYPE numeric(10,7);

-- 2. Add delivery intelligence fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_geocoded_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_geocoding_status text NOT NULL DEFAULT 'not_attempted';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_distance_car_meters integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_duration_car_seconds integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_distance_walk_meters integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_duration_walk_seconds integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_distance_calculated_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_distance_error text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS suggested_delivery_fee_amount integer; -- stored in Polish grosz

-- 3. Add constraint validation for delivery_geocoding_status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_delivery_geocoding_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_delivery_geocoding_status 
  CHECK (delivery_geocoding_status IN ('not_attempted', 'success', 'failed', 'partial', 'manual_required'));
