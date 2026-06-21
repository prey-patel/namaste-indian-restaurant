import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth check
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active || (profile.role !== 'owner' && profile.role !== 'manager')) {
    redirect('/admin/login');
  }

  // 3. Fetch settings data in parallel (including gallery assets)
  const [
    settingsRes,
    opStatusRes,
    serviceHoursRes,
    deliveryZonesRes,
    deliveryRulesRes,
    packagingFeesRes,
    holidayClosuresRes,
    galleryImagesRes
  ] = await Promise.all([
    supabase.from('system_settings').select('*'),
    supabase.from('operational_status').select('*').single(),
    supabase.from('service_hours').select('*').order('day_of_week', { ascending: true }).order('display_order', { ascending: true }),
    supabase.from('delivery_zones').select('*').order('name', { ascending: true }),
    supabase.from('delivery_fee_rules').select('*').order('display_order', { ascending: true }),
    supabase.from('packaging_fee_rules').select('*').order('fee_type', { ascending: true }),
    supabase.from('holiday_closures').select('*').order('date', { ascending: true }),
    supabase.from('media_assets').select('*').eq('bucket', 'gallery-images').order('created_at', { ascending: false })
  ]);

  const rawSettings = settingsRes.data || [];
  const systemSettings = rawSettings.reduce((acc: Record<string, any>, item: { key: string; value: any }) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  const rawGallery = galleryImagesRes.data || [];
  const galleryImages = [];

  if (rawGallery.length > 0) {
    const adminClient = createAdminClient();
    for (const asset of rawGallery) {
      const { data: signData, error: signError } = await adminClient.storage
        .from('gallery-images')
        .createSignedUrl(asset.file_path, 3600); // 1 hour

      if (signData?.signedUrl && !signError) {
        galleryImages.push({
          id: asset.id,
          file_path: asset.file_path,
          url: signData.signedUrl,
          alt_text_pl: asset.alt_text_pl,
          alt_text_en: asset.alt_text_en,
          created_at: asset.created_at
        });
      }
    }
  }

  return (
    <SettingsClient
      profile={profile}
      systemSettings={systemSettings}
      operationalStatus={opStatusRes.data || null}
      serviceHours={serviceHoursRes.data || []}
      deliveryZones={deliveryZonesRes.data || []}
      deliveryRules={deliveryRulesRes.data || []}
      packagingFees={packagingFeesRes.data || []}
      holidayClosures={holidayClosuresRes.data || []}
      galleryImages={galleryImages}
    />
  );
}
