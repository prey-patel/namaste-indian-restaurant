'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { categoryFormSchema, menuItemFormSchema } from '@/lib/validation/admin-menu';
import { z } from 'zod';
import { getImageSignedUrl } from '@/lib/supabase/menu';

/**
 * Checks if the current request is authenticated and has owner or manager roles.
 * Returns the current authenticated user's ID.
 */
async function validateAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Unauthenticated user');
  }

  // Fetch role and active status from public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Unauthorized: Admin profile not found');
  }

  if (!profile.is_active) {
    throw new Error('Unauthorized: Admin account is inactive');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return user.id;
}

// Helper to revalidate all menu pages and tags
function revalidateMenu() {
  revalidatePath('/[locale]/menu', 'layout');
  revalidatePath('/admin/menu', 'layout');
  revalidateTag('public-menu');
  revalidateTag('public-menu-images');
}

// ==========================================
// CATEGORY ACTIONS
// ==========================================

export async function createCategoryAction(rawData: z.infer<typeof categoryFormSchema>) {
  try {
    const adminId = await validateAdminAccess();
    const data = categoryFormSchema.parse(rawData);

    const supabase = await createClient();
    const { error } = await supabase
      .from('categories')
      .insert({
        name_pl: data.name_pl,
        name_en: data.name_en,
        slug: data.slug,
        display_order: data.display_order,
        is_active: data.is_active,
        is_deleted: false,
      });

    if (error) {
      console.error('Database error in createCategoryAction:', error);
      return { success: false, error: 'Database write failed' };
    }

    revalidateMenu();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to create category:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function updateCategoryAction(id: string, rawData: Partial<z.infer<typeof categoryFormSchema>>) {
  try {
    await validateAdminAccess();
    
    // Partial parse
    const data = categoryFormSchema.partial().parse(rawData);

    const supabase = await createClient();
    const { error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Database error in updateCategoryAction:', error);
      return { success: false, error: 'Database update failed' };
    }

    revalidateMenu();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update category:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const adminId = await validateAdminAccess();

    const supabase = await createClient();
    
    // Perform soft delete
    const { error } = await supabase
      .from('categories')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
      })
      .eq('id', id);

    if (error) {
      console.error('Database error in deleteCategoryAction:', error);
      return { success: false, error: 'Database deletion failed' };
    }

    revalidateMenu();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete category:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

// ==========================================
// MENU ITEM ACTIONS
// ==========================================

export async function createMenuItemAction(rawData: z.infer<typeof menuItemFormSchema>, packagingRules?: { ruleId: string; quantity: number }[]) {
  try {
    await validateAdminAccess();
    const data = menuItemFormSchema.parse(rawData);

    const supabase = await createClient();
    const { data: newItem, error } = await supabase
      .from('menu_items')
      .insert({
        category_id: data.category_id,
        name_pl: data.name_pl,
        name_en: data.name_en,
        description_pl: data.description_pl,
        description_en: data.description_en,
        price: data.price,
        display_order: data.display_order,
        spiciness: data.spiciness,
        allergens: data.allergens,
        is_vegetarian: data.is_vegetarian,
        is_vegan: data.is_vegan,
        is_gluten_free: data.is_gluten_free,
        is_chef_special: data.is_chef_special,
        is_popular: data.is_popular,
        is_new: data.is_new,
        image_url: data.image_url,
        is_available: true,
        is_active: true,
        is_deleted: false,
      })
      .select('id')
      .single();

    if (error || !newItem) {
      console.error('Database error in createMenuItemAction:', error);
      return { success: false, error: 'Database write failed' };
    }

    if (packagingRules && packagingRules.length > 0) {
      const mappings = packagingRules.map(rule => ({
        menu_item_id: newItem.id,
        packaging_fee_rule_id: rule.ruleId,
        default_quantity: rule.quantity,
        is_required: true
      }));

      const { error: mappingErr } = await supabase
        .from('menu_item_packaging_rules')
        .insert(mappings);

      if (mappingErr) {
        console.error('Database error saving packaging rules:', mappingErr);
        await supabase.from('menu_items').delete().eq('id', newItem.id);
        return { success: false, error: 'Failed to assign packaging rules: ' + mappingErr.message };
      }
    }

    revalidateMenu();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to create menu item:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function updateMenuItemAction(
  id: string,
  rawData: Partial<z.infer<typeof menuItemFormSchema>> & { is_available?: boolean; is_active?: boolean },
  packagingRules?: { ruleId: string; quantity: number }[]
) {
  try {
    await validateAdminAccess();

    // Partial parse of Zod schema fields plus explicit boolean flags
    const { is_available, is_active, ...zodFields } = rawData;
    const data = menuItemFormSchema.partial().parse(zodFields);

    const updatePayload: Record<string, any> = { ...data };
    if (is_available !== undefined) updatePayload.is_available = is_available;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const supabase = await createClient();
    const { error } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Database error in updateMenuItemAction:', error);
      return { success: false, error: 'Database update failed' };
    }

    if (packagingRules) {
      const { error: deleteErr } = await supabase
        .from('menu_item_packaging_rules')
        .delete()
        .eq('menu_item_id', id);

      if (deleteErr) {
        console.error('Database error deleting packaging rules:', deleteErr);
        return { success: false, error: 'Failed to update packaging rules mappings' };
      }

      if (packagingRules.length > 0) {
        const mappings = packagingRules.map(rule => ({
          menu_item_id: id,
          packaging_fee_rule_id: rule.ruleId,
          default_quantity: rule.quantity,
          is_required: true
        }));

        const { error: mappingErr } = await supabase
          .from('menu_item_packaging_rules')
          .insert(mappings);

        if (mappingErr) {
          console.error('Database error inserting packaging rules:', mappingErr);
          return { success: false, error: 'Failed to assign packaging rules' };
        }
      }
    }

    revalidateMenu();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update menu item:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function deleteMenuItemAction(id: string) {
  try {
    const adminId = await validateAdminAccess();

    const supabase = await createClient();
    
    // Perform soft delete
    const { error } = await supabase
      .from('menu_items')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
      })
      .eq('id', id);

    if (error) {
      console.error('Database error in deleteMenuItemAction:', error);
      return { success: false, error: 'Database deletion failed' };
    }

    revalidateMenu();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete menu item:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

// ==========================================
// MEDIA & UPLOAD ACTIONS
// ==========================================

export async function uploadMenuImageAction(formData: FormData) {
  try {
    const adminId = await validateAdminAccess();
    
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }

    // 1. File type and size validations
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PNG, JPEG, JPG, and WEBP are allowed.' };
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size exceeds the 5MB limit.' };
    }

    // Convert file to buffer for Supabase Storage Node upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Generate a secure, unique path to prevent path traversal
    const fileExt = file.name.split('.').pop();
    const safeUuid = crypto.randomUUID();
    const safePath = `items/${safeUuid}/${Date.now()}.${fileExt}`;

    const supabase = await createClient();

    // 3. Upload to private 'menu-images' bucket using the authenticated user's client
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(safePath, buffer, {
        contentType: file.type,
        duplex: 'half',
      });

    if (uploadError) {
      console.error('Storage upload error in uploadMenuImageAction:', uploadError);
      return { success: false, error: 'Failed to upload to storage bucket' };
    }

    // 4. Log the uploaded asset inside 'media_assets' table (sets as approved & public)
    const { data: assetRecord, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        bucket: 'menu-images',
        file_path: safePath,
        file_type: file.type,
        file_size: file.size,
        is_public: true,
        is_approved: true,
        uploaded_by: adminId,
      })
      .select('id, file_path')
      .single();

    if (assetError) {
      console.error('Media asset logging error in uploadMenuImageAction:', assetError);
      
      // Attempt to clean up orphaned storage object
      await supabase.storage.from('menu-images').remove([safePath]);
      return { success: false, error: 'Failed to log media asset metadata' };
    }

    return { success: true, filePath: assetRecord.file_path };
  } catch (err: any) {
    console.error('Failed to upload menu image:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function getAvailableMenuImages() {
  try {
    await validateAdminAccess();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('media_assets')
      .select('id, file_path, alt_text_pl, alt_text_en')
      .eq('bucket', 'menu-images')
      .eq('is_public', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching available menu images:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to load menu images library:', err);
    return [];
  }
}

export async function getSingleSignedUrlAction(filePath: string) {
  try {
    await validateAdminAccess();
    return await getImageSignedUrl(filePath);
  } catch (err) {
    console.error('Failed to sign URL:', err);
    return null;
  }
}
