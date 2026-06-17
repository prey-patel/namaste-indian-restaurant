import "server-only";

import { createClient } from './server';

export type PublicSettings = {
  restaurant_address?: string;
  restaurant_full_address?: string;
  restaurant_phone?: string;
  opening_status?: { is_open: boolean; message: string | null };
  public_messages?: { alert_banner: string | null; welcome_message: string };
  public_service_hours?: { dine_in: string; delivery: string };
  coordinates?: { status: string; latitude: number | null; longitude: number | null };
  // Profile settings
  restaurant_name?: string;
  public_display_name?: string;
  restaurant_email?: string;
  google_maps_link?: string;
  short_description?: string;
  restaurant_city?: string;
  restaurant_postal_code?: string;
  restaurant_country?: string;
  // Reservation rules
  reservation_max_guests?: number;
  reservation_min_lead_time_hours?: number;
  reservation_max_days_ahead?: number;
  reservation_contact_instructions?: string;
  // Delivery settings
  delivery_minimum_order_value?: number;
};

/**
 * Server-only helper to fetch public-safe settings via get_public_system_settings RPC.
 * Returns defaults if settings are missing or database is offline.
 */
export async function getPublicSystemSettings(): Promise<PublicSettings> {
  const defaults: PublicSettings = {
    restaurant_address: 'Warszawska 1/3',
    restaurant_full_address: 'Warszawska 1/3, 06-400 Ciechanów, Poland',
    restaurant_phone: '511984331',
    opening_status: { is_open: true, message: null },
    public_messages: { alert_banner: null, welcome_message: 'Welcome to Namaste Indian Restaurant!' },
    public_service_hours: { dine_in: '12:00 - 22:00', delivery: '12:00 - 21:30' },
    coordinates: { status: 'unverified', latitude: null, longitude: null },
    restaurant_name: 'namaste-indian-restaurant',
    public_display_name: 'Namaste Indian Restaurant',
    restaurant_email: 'preyapatel247@gmail.com',
    google_maps_link: '',
    short_description: 'Authentic Indian restaurant in Ciechanów',
    restaurant_city: 'Ciechanów',
    restaurant_postal_code: '06-400',
    restaurant_country: 'Poland',
    reservation_max_guests: 8,
    reservation_min_lead_time_hours: 2,
    reservation_max_days_ahead: 30,
    reservation_contact_instructions: 'For large parties, please call the restaurant directly.',
    delivery_minimum_order_value: 0
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_public_system_settings');

    if (error || !data || !Array.isArray(data)) {
      return defaults;
    }

    const settings: Record<string, any> = {};
    data.forEach((item: { key: string; value: any }) => {
      settings[item.key] = item.value;
    });

    const rawAddress = settings.restaurant_address || defaults.restaurant_address || '';
    const city = settings.restaurant_city || defaults.restaurant_city || '';
    const zip = settings.restaurant_postal_code || defaults.restaurant_postal_code || '';
    const country = settings.restaurant_country || defaults.restaurant_country || '';

    let fullAddress = rawAddress;
    if (zip && !rawAddress.includes(zip)) {
      const cityZip = [zip, city].filter(Boolean).join(' ');
      if (cityZip) {
        fullAddress = `${rawAddress}, ${cityZip}`;
      }
    } else if (city && !rawAddress.includes(city)) {
      fullAddress = `${rawAddress}, ${city}`;
    }
    if (country && !fullAddress.includes(country)) {
      fullAddress = `${fullAddress}, ${country}`;
    }

    return {
      restaurant_address: settings.restaurant_address || defaults.restaurant_address,
      restaurant_full_address: fullAddress,
      restaurant_phone: settings.restaurant_phone || defaults.restaurant_phone,
      opening_status: settings.opening_status || defaults.opening_status,
      public_messages: settings.public_messages || defaults.public_messages,
      public_service_hours: settings.public_service_hours || defaults.public_service_hours,
      coordinates: settings.coordinates || defaults.coordinates,
      restaurant_name: settings.restaurant_name || defaults.restaurant_name,
      public_display_name: settings.public_display_name || defaults.public_display_name,
      restaurant_email: settings.restaurant_email || defaults.restaurant_email,
      google_maps_link: settings.google_maps_link || defaults.google_maps_link,
      short_description: settings.short_description || defaults.short_description,
      restaurant_city: settings.restaurant_city || defaults.restaurant_city,
      restaurant_postal_code: settings.restaurant_postal_code || defaults.restaurant_postal_code,
      restaurant_country: settings.restaurant_country || defaults.restaurant_country,
      reservation_max_guests: typeof settings.reservation_max_guests === 'number' ? settings.reservation_max_guests : defaults.reservation_max_guests,
      reservation_min_lead_time_hours: typeof settings.reservation_min_lead_time_hours === 'number' ? settings.reservation_min_lead_time_hours : defaults.reservation_min_lead_time_hours,
      reservation_max_days_ahead: typeof settings.reservation_max_days_ahead === 'number' ? settings.reservation_max_days_ahead : defaults.reservation_max_days_ahead,
      reservation_contact_instructions: settings.reservation_contact_instructions || defaults.reservation_contact_instructions,
      delivery_minimum_order_value: typeof settings.delivery_minimum_order_value === 'number' ? settings.delivery_minimum_order_value : (settings.delivery_minimum_order_value !== undefined ? Number(settings.delivery_minimum_order_value) : defaults.delivery_minimum_order_value)
    };
  } catch (err) {
    console.error('Failed to load public system settings:', err);
    return defaults;
  }
}
