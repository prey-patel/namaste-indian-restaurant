import "server-only";

import { createClient } from './server';

export type PublicSettings = {
  restaurant_address?: string;
  restaurant_phone?: string;
  opening_status?: { is_open: boolean; message: string | null };
  public_messages?: { alert_banner: string | null; welcome_message: string };
  public_service_hours?: { dine_in: string; delivery: string };
  coordinates?: { status: string; latitude: number | null; longitude: number | null };
};

/**
 * Server-only helper to fetch public-safe settings via get_public_system_settings RPC.
 * Returns defaults if settings are missing or database is offline.
 */
export async function getPublicSystemSettings(): Promise<PublicSettings> {
  const defaults: PublicSettings = {
    restaurant_address: 'Warszawska 1/3, 06-400 Ciechanów, Poland',
    restaurant_phone: '511984331',
    opening_status: { is_open: true, message: null },
    public_messages: { alert_banner: null, welcome_message: 'Welcome to Namaste Indian Restaurant!' },
    public_service_hours: { dine_in: '12:00 - 22:00', delivery: '12:00 - 21:30' },
    coordinates: { status: 'unverified', latitude: null, longitude: null }
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

    return {
      restaurant_address: settings.restaurant_address || defaults.restaurant_address,
      restaurant_phone: settings.restaurant_phone || defaults.restaurant_phone,
      opening_status: settings.opening_status || defaults.opening_status,
      public_messages: settings.public_messages || defaults.public_messages,
      public_service_hours: settings.public_service_hours || defaults.public_service_hours,
      coordinates: settings.coordinates || defaults.coordinates
    };
  } catch (err) {
    console.error('Failed to load public system settings:', err);
    return defaults;
  }
}
