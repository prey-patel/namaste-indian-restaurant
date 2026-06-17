-- Migration: Add delivery_minimum_order_value to get_public_system_settings RPC whitelist.

-- 1. Insert default setting if it doesn't exist
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('delivery_minimum_order_value', '0'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- 2. Update get_public_system_settings RPC
CREATE OR REPLACE FUNCTION public.get_public_system_settings()
RETURNS TABLE(key text, value jsonb) AS $$
BEGIN
    RETURN QUERY
    SELECT s.key, s.value
    FROM public.system_settings s
    WHERE s.key IN (
        'restaurant_address',
        'restaurant_phone',
        'timezone',
        'site_url',
        'coordinates',
        'opening_status',
        'public_messages',
        'public_service_hours',
        -- Profile settings
        'restaurant_name',
        'public_display_name',
        'restaurant_email',
        'google_maps_link',
        'short_description',
        'restaurant_city',
        'restaurant_postal_code',
        'restaurant_country',
        -- Reservation rules
        'reservation_max_guests',
        'reservation_min_lead_time_hours',
        'reservation_max_days_ahead',
        'reservation_contact_instructions',
        -- Delivery settings
        'delivery_minimum_order_value'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
