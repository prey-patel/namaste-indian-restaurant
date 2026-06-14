-- Migration: Update public system settings RPC to include extended profile and reservation settings keys.
-- Exposes only customer-safe, public-facing configurations.

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
        'reservation_contact_instructions'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
