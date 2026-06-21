'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { geocodeRestaurantAddress } from '@/lib/delivery/distance';

// Helper to check owner/manager authorization
async function verifyAuth() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    throw new Error('Unauthorized');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    throw new Error('Unauthorized');
  }

  return { supabase, userId: user.id };
}

// Helper to trigger revalidation of affected paths
function revalidateAllPaths() {
  const paths = [
    '/',
    '/pl',
    '/en',
    '/pl/contact',
    '/en/contact',
    '/pl/reservations',
    '/en/reservations',
    '/pl/order',
    '/en/order',
    '/pl/gallery',
    '/en/gallery',
    '/admin',
    '/admin/settings'
  ];
  for (const p of paths) {
    revalidatePath(p);
  }
}

// 1. Restaurant Profile Action
const ProfileSchema = z.object({
  restaurant_name: z.string().min(2).max(100),
  public_display_name: z.string().min(2).max(100),
  restaurant_address: z.string().min(5).max(200),
  restaurant_city: z.string().min(2).max(50),
  restaurant_postal_code: z.string().min(5).max(10),
  restaurant_country: z.string().min(2).max(50),
  restaurant_phone: z.string().min(9).max(20),
  restaurant_email: z.string().email(),
  site_url: z.string().url(),
  google_maps_link: z.string().url().or(z.string().length(0)),
  short_description: z.string().max(500)
});

export async function updateRestaurantProfileAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = ProfileSchema.parse(rawData);

    // Fetch existing settings to check if address changed
    const { data: existingSettings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['restaurant_address', 'restaurant_city', 'restaurant_postal_code', 'restaurant_country']);

    const oldSettings: Record<string, any> = {};
    existingSettings?.forEach((s: any) => {
      oldSettings[s.key] = s.value;
    });

    const isAddressChanged =
      oldSettings.restaurant_address !== data.restaurant_address ||
      oldSettings.restaurant_city !== data.restaurant_city ||
      oldSettings.restaurant_postal_code !== data.restaurant_postal_code ||
      oldSettings.restaurant_country !== data.restaurant_country;

    // Save key-value settings in system_settings
    const keys = Object.keys(data) as Array<keyof typeof data>;
    
    for (const key of keys) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value: data[key],
          updated_by: userId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    if (isAddressChanged) {
      console.log('[Settings Profile] Restaurant address changed. Invalidating and re-geocoding coordinates...');
      // 1. Invalidate current coordinates
      await supabase
        .from('system_settings')
        .upsert({
          key: 'coordinates',
          value: { status: 'unverified', latitude: null, longitude: null },
          updated_by: userId,
          updated_at: new Date().toISOString()
        });
        
      // 2. Trigger re-geocoding
      try {
        await geocodeRestaurantAddress();
      } catch (err) {
        console.error('Restaurant address re-geocoding failed:', err);
      }
    }

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateRestaurantProfileAction error:', err);
    return { success: false, error: err.message || 'Failed to update profile' };
  }
}

// 2. Operational Status Action
const OperationalStatusSchema = z.object({
  id: z.string().uuid(),
  delivery_enabled: z.boolean(),
  takeaway_enabled: z.boolean(),
  reservations_enabled: z.boolean(),
  dine_in_status: z.string().min(2).max(20),
  kitchen_busy_mode: z.boolean(),
  temporary_message_pl: z.string().max(300).nullable().optional(),
  temporary_message_en: z.string().max(300).nullable().optional(),
  estimated_delay_minutes: z.number().int().min(0).max(180)
});

export async function updateOperationalStatusAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = OperationalStatusSchema.parse(rawData);

    const { error } = await supabase
      .from('operational_status')
      .update({
        delivery_enabled: data.delivery_enabled,
        takeaway_enabled: data.takeaway_enabled,
        reservations_enabled: data.reservations_enabled,
        dine_in_status: data.dine_in_status,
        kitchen_busy_mode: data.kitchen_busy_mode,
        temporary_message_pl: data.temporary_message_pl || null,
        temporary_message_en: data.temporary_message_en || null,
        estimated_delay_minutes: data.estimated_delay_minutes,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (error) throw error;

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateOperationalStatusAction error:', err);
    return { success: false, error: err.message || 'Failed to update status' };
  }
}

// 3. Service Hours Action
const ServiceHourItemSchema = z.object({
  id: z.string().uuid(),
  open_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid open time'),
  close_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid close time'),
  is_closed: z.boolean(),
  min_lead_time_minutes: z.number().int().min(0),
  max_preorder_days: z.number().int().min(0)
});

const ServiceHoursListSchema = z.array(ServiceHourItemSchema);

export async function updateServiceHoursAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const items = ServiceHoursListSchema.parse(rawData);

    for (const item of items) {
      const { error } = await supabase
        .from('service_hours')
        .update({
          open_time: item.open_time,
          close_time: item.close_time,
          is_closed: item.is_closed,
          min_lead_time_minutes: item.min_lead_time_minutes,
          max_preorder_days: item.max_preorder_days,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;
    }

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateServiceHoursAction error:', err);
    return { success: false, error: err.message || 'Failed to update service hours' };
  }
}

// 4. Reservation Settings Action
const ReservationSettingsSchema = z.object({
  reservation_max_guests: z.number().int().min(1).max(100),
  reservation_min_lead_time_hours: z.number().int().min(0).max(48),
  reservation_max_days_ahead: z.number().int().min(1).max(365),
  reservation_contact_instructions: z.string().max(500)
});

export async function updateReservationSettingsAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = ReservationSettingsSchema.parse(rawData);

    const keys = Object.keys(data) as Array<keyof typeof data>;
    for (const key of keys) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value: data[key],
          updated_by: userId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateReservationSettingsAction error:', err);
    return { success: false, error: err.message || 'Failed to update reservation rules' };
  }
}

// 5. Delivery & Takeaway Settings Action
const DeliveryZoneSchema = z.object({
  id: z.string().uuid(),
  radius_km: z.number().nullable().optional(),
  min_order_amount: z.number().min(0),
  delivery_fee: z.number().min(0),
  estimated_delivery_minutes: z.number().int().min(0),
  is_active: z.boolean()
});

const DeliveryFeeRuleSchema = z.object({
  id: z.string(), // UUID for existing, temp string (e.g. 'new-1234') for new zones
  isNew: z.boolean().optional().default(false),
  name: z.string().min(1).max(100),
  min_distance_km: z.number().min(0),
  max_distance_km: z.number().min(0).nullable().optional(),
  fee_amount: z.number().min(0),
  rule_action: z.enum(['allow', 'contact_restaurant', 'block']),
  is_active: z.boolean()
});

const DeliveryTakeawaySettingsSchema = z.object({
  zones: z.array(DeliveryZoneSchema),
  rules: z.array(DeliveryFeeRuleSchema),
  delivery_minimum_order_value: z.number().min(0)
});

export async function updateDeliveryTakeawaySettingsAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = DeliveryTakeawaySettingsSchema.parse(rawData);

    // Update delivery zones (unchanged logic)
    for (const zone of data.zones) {
      const { error } = await supabase
        .from('delivery_zones')
        .update({
          radius_km: zone.radius_km || null,
          min_order_amount: zone.min_order_amount,
          delivery_fee: zone.delivery_fee,
          estimated_delivery_minutes: zone.estimated_delivery_minutes,
          is_active: zone.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', zone.id);

      if (error) throw error;
    }

    // === DELIVERY FEE RULES: Atomic replace to avoid overlap constraint ===
    //
    // Strategy: deactivate ALL existing rules first (so the DB overlap trigger
    // sees no active rows when we update/insert each rule), then update/insert
    // each rule individually. Finally delete any rules removed by the admin.
    //
    // This avoids the "Overlapping active delivery fee rules are not allowed"
    // error that occurs when updating zone boundaries one at a time while
    // other zones with old boundaries are still active.

    // Step 1: Get all existing rule IDs in DB
    const { data: existingRules, error: fetchErr } = await supabase
      .from('delivery_fee_rules')
      .select('id');
    if (fetchErr) throw fetchErr;

    const existingIds = new Set((existingRules || []).map((r: any) => r.id as string));
    const incomingExistingIds = new Set<string>();

    // Step 2: Deactivate all existing rules to prevent overlap trigger
    if (existingIds.size > 0) {
      const { error: deactivateErr } = await supabase
        .from('delivery_fee_rules')
        .update({ is_active: false })
        .in('id', [...existingIds]);
      if (deactivateErr) throw deactivateErr;
    }

    // Step 3: Update existing rules, insert new ones
    for (let i = 0; i < data.rules.length; i++) {
      const rule = data.rules[i];
      const rulePayload: Record<string, any> = {
        name: rule.name,
        min_distance_km: rule.min_distance_km,
        max_distance_km: rule.max_distance_km ?? null,
        fee_amount: rule.fee_amount,
        rule_action: rule.rule_action,
        is_active: rule.is_active,
        display_order: i,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      if (rule.isNew) {
        // INSERT new zone
        const { error: insertErr } = await supabase
          .from('delivery_fee_rules')
          .insert(rulePayload);
        if (insertErr) throw new Error(`Failed to create zone "${rule.name}": ${insertErr.message}`);
      } else {
        // UPDATE existing zone
        const { error: updateErr } = await supabase
          .from('delivery_fee_rules')
          .update(rulePayload)
          .eq('id', rule.id);
        if (updateErr) throw new Error(`Failed to update zone "${rule.name}": ${updateErr.message}`);
        incomingExistingIds.add(rule.id);
      }
    }

    // Step 4: Delete zones removed by the admin
    for (const existingId of existingIds) {
      if (!incomingExistingIds.has(existingId)) {
        const { error: deleteErr } = await supabase
          .from('delivery_fee_rules')
          .delete()
          .eq('id', existingId);
        if (deleteErr) throw new Error(`Failed to delete zone: ${deleteErr.message}`);
      }
    }

    // Update delivery minimum order value
    const { error: minOrderError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'delivery_minimum_order_value',
        value: data.delivery_minimum_order_value,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });

    if (minOrderError) throw minOrderError;

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateDeliveryTakeawaySettingsAction error:', err);
    return { success: false, error: err.message || 'Failed to update delivery rules' };
  }
}

// 6. Charges & Fees Action
const PackagingFeeRuleUpdateSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().min(0),
  is_active: z.boolean()
});

const ChargesFeesSettingsSchema = z.object({
  packaging_fees: z.array(PackagingFeeRuleUpdateSchema)
});

export async function updateFeeSettingsAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = ChargesFeesSettingsSchema.parse(rawData);

    for (const fee of data.packaging_fees) {
      const { error } = await supabase
        .from('packaging_fee_rules')
        .update({
          amount: fee.amount,
          is_active: fee.is_active,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', fee.id);

      if (error) throw error;
    }

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateFeeSettingsAction error:', err);
    return { success: false, error: err.message || 'Failed to update charges' };
  }
}

// 7. Holiday Closures Actions
const HolidayClosureSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  title_pl: z.string().min(2).max(100),
  title_en: z.string().min(2).max(100),
  affected_service: z.enum(['all', 'dine_in', 'reservations', 'delivery', 'takeaway']),
  is_closed: z.boolean(),
  message_pl: z.string().max(300).nullable().optional(),
  message_en: z.string().max(300).nullable().optional()
});

export async function createHolidayClosureAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = HolidayClosureSchema.parse(rawData);

    const { error } = await supabase
      .from('holiday_closures')
      .insert({
        date: data.date,
        title_pl: data.title_pl,
        title_en: data.title_en,
        affected_service: data.affected_service,
        is_closed: data.is_closed,
        message_pl: data.message_pl || null,
        message_en: data.message_en || null,
        updated_by: userId
      });

    if (error) throw error;

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('createHolidayClosureAction error:', err);
    return { success: false, error: err.message || 'Failed to create closure' };
  }
}

export async function updateHolidayClosureAction(rawData: unknown) {
  try {
    const { supabase, userId } = await verifyAuth();
    const data = HolidayClosureSchema.parse(rawData);

    if (!data.id) throw new Error('Closure ID is required');

    const { error } = await supabase
      .from('holiday_closures')
      .update({
        date: data.date,
        title_pl: data.title_pl,
        title_en: data.title_en,
        affected_service: data.affected_service,
        is_closed: data.is_closed,
        message_pl: data.message_pl || null,
        message_en: data.message_en || null,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (error) throw error;

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('updateHolidayClosureAction error:', err);
    return { success: false, error: err.message || 'Failed to update closure' };
  }
}

export async function deleteHolidayClosureAction(id: string) {
  try {
    const { supabase } = await verifyAuth();
    z.string().uuid().parse(id);

    const { error } = await supabase
      .from('holiday_closures')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('deleteHolidayClosureAction error:', err);
    return { success: false, error: err.message || 'Failed to delete closure' };
  }
}

// ==========================================
// PHOTO GALLERY MANAGEMENT ACTIONS
// ==========================================

export async function uploadGalleryImagesAction(formData: FormData) {
  try {
    const { supabase, userId } = await verifyAuth();
    
    const files = formData.getAll('files') as File[];
    if (!files || files.length === 0) {
      return { success: false, error: 'No files uploaded' };
    }

    const adminClient = createAdminClient();
    const results = [];

    for (const file of files) {
      // 1. Image validation
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        results.push({ name: file.name, success: false, error: 'Invalid file type. Only PNG, JPEG, JPG, and WEBP allowed.' });
        continue;
      }

      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        results.push({ name: file.name, success: false, error: 'File size exceeds the 5MB limit.' });
        continue;
      }

      // 2. Convert to buffer for Supabase Storage
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 3. Generate secure safe path
      const fileExt = file.name.split('.').pop();
      const safeUuid = crypto.randomUUID();
      const safePath = `gallery/${safeUuid}/${Date.now()}.${fileExt}`;

      // 4. Upload to storage using server client (inherits auth role permissions)
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(safePath, buffer, {
          contentType: file.type,
          duplex: 'half',
        });

      if (uploadError) {
        console.error(`Storage upload error for "${file.name}":`, uploadError);
        results.push({ name: file.name, success: false, error: 'Failed to upload to storage' });
        continue;
      }

      // 5. Log in media_assets table
      const altText = file.name.split('.')[0]?.replace(/[-_]+/g, ' ') || 'Gallery Image';
      const { data: assetRecord, error: assetError } = await supabase
        .from('media_assets')
        .insert({
          bucket: 'gallery-images',
          file_path: safePath,
          file_type: file.type,
          file_size: file.size,
          is_public: true,
          is_approved: true,
          uploaded_by: userId,
          alt_text_en: altText,
          alt_text_pl: altText,
        })
        .select('id, file_path, alt_text_pl, alt_text_en, created_at')
        .single();

      if (assetError) {
        console.error(`Metadata insert error for "${file.name}":`, assetError);
        await supabase.storage.from('gallery-images').remove([safePath]);
        results.push({ name: file.name, success: false, error: 'Failed to log metadata' });
        continue;
      }

      // 6. Generate signed URL for immediate client feedback
      const { data: signData, error: signError } = await adminClient.storage
        .from('gallery-images')
        .createSignedUrl(safePath, 3600); // 1 hour

      results.push({
        id: assetRecord.id,
        file_path: assetRecord.file_path,
        url: signData?.signedUrl || '',
        alt_text_pl: assetRecord.alt_text_pl,
        alt_text_en: assetRecord.alt_text_en,
        created_at: assetRecord.created_at,
        name: file.name,
        success: true
      });
    }

    revalidateAllPaths();

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: true,
      message: `Uploaded ${succeeded} images successfully.${failed > 0 ? ` Failed to upload ${failed} images.` : ''}`,
      results
    };
  } catch (err: any) {
    console.error('uploadGalleryImagesAction error:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function deleteGalleryImageAction(id: string, filePath: string) {
  try {
    const { supabase } = await verifyAuth();
    z.string().uuid().parse(id);
    z.string().min(1).parse(filePath);

    // 1. Delete DB metadata
    const { error: dbError } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error(`Database deletion error for media id ${id}:`, dbError);
      return { success: false, error: 'Failed to remove database record' };
    }

    // 2. Delete storage file
    const { error: storageError } = await supabase.storage
      .from('gallery-images')
      .remove([filePath]);

    if (storageError) {
      console.error(`Storage deletion error for path ${filePath}:`, storageError);
      // We don't fail the whole action if the file is already gone, but we log it
    }

    revalidateAllPaths();
    return { success: true };
  } catch (err: any) {
    console.error('deleteGalleryImageAction error:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

