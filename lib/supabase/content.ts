import "server-only";

import { createClient } from './server';

/**
 * Server-only helper to load public localized content from the site_content table.
 * Falls back to returning null if the record is missing or database is offline.
 */
export async function getSiteContent(key: string): Promise<{ value_pl: any; value_en: any } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_content')
      .select('value_pl, value_en')
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    return data as { value_pl: any; value_en: any };
  } catch (err) {
    console.error(`Failed to load site content for key "${key}":`, err);
    return null;
  }
}
