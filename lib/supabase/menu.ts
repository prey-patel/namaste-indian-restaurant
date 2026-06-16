import "server-only";

import { createClient } from './server';
import { createAdminClient } from './admin';

export type PublicCategory = {
  id: string;
  name_pl: string;
  name_en: string;
  slug: string;
  display_order: number;
};

export type PublicMenuItem = {
  id: string;
  category_id: string;
  name_pl: string;
  name_en: string;
  description_pl: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
  spiciness: number;
  allergens: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_chef_special: boolean;
  is_popular: boolean;
  is_new: boolean;
  display_order: number;
  signed_image_url?: string | null;
  is_available: boolean;
};

/**
 * Fetches active, non-deleted categories from the database using public/anon client.
 */
export async function getPublicCategories(): Promise<PublicCategory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, name_pl, name_en, slug, display_order')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading public categories:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Database connection error in getPublicCategories:', err);
    return [];
  }
}

/**
 * Fetches active, available, non-deleted menu items using public/anon client.
 */
export async function getPublicMenuItems(): Promise<PublicMenuItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        category_id,
        name_pl,
        name_en,
        description_pl,
        description_en,
        price,
        image_url,
        spiciness,
        allergens,
        is_vegetarian,
        is_vegan,
        is_gluten_free,
        is_chef_special,
        is_popular,
        is_new,
        display_order,
        is_available
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading public menu items:', error);
      return [];
    }

    // Convert price to number just in case pg returns it as string (numeric type)
    const formattedData = (data || []).map(item => ({
      ...item,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
    }));

    return formattedData;
  } catch (err) {
    console.error('Database connection error in getPublicMenuItems:', err);
    return [];
  }
}

/**
 * Securely resolves a temporary signed URL for a public, approved menu image path.
 * Verifies with the anon client that the asset is approved and public before signing.
 */
export async function getImageSignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;

  try {
    const supabase = await createClient();

    // Query media_assets with public client to verify RLS permission (only approved & public assets are visible)
    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .select('bucket, file_path, is_public, is_approved')
      .eq('file_path', filePath)
      .eq('bucket', 'menu-images')
      .eq('is_public', true)
      .eq('is_approved', true)
      .single();

    if (assetError || !asset) {
      // Asset is not approved, not public, or doesn't exist under menu-images
      return null;
    }

    // Create secure admin client to sign the private storage URL
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from('menu-images')
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    if (error || !data) {
      console.error(`Failed to create signed URL for path "${filePath}":`, error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error(`Error resolving signed URL for path "${filePath}":`, err);
    return null;
  }
}

/**
 * High-level server loader: fetches categories, items, and resolves verified signed image URLs.
 */
export async function getPublicMenuData(): Promise<{
  categories: PublicCategory[];
  items: PublicMenuItem[];
}> {
  const [categories, items] = await Promise.all([
    getPublicCategories(),
    getPublicMenuItems(),
  ]);

  // Resolve signed URLs for items that have an image path
  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      if (item.image_url) {
        const signedUrl = await getImageSignedUrl(item.image_url);
        return { ...item, signed_image_url: signedUrl };
      }
      return { ...item, signed_image_url: null };
    })
  );

  return {
    categories,
    items: resolvedItems,
  };
}
