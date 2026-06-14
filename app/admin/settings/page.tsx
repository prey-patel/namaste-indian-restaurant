import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  // 3. Fetch settings data in parallel
  const [
    settingsRes,
    opStatusRes,
    serviceHoursRes,
    deliveryZonesRes,
    deliveryRulesRes,
    packagingFeesRes,
    holidayClosuresRes
  ] = await Promise.all([
    supabase.from('system_settings').select('*'),
    supabase.from('operational_status').select('*').single(),
    supabase.from('service_hours').select('*').order('day_of_week', { ascending: true }).order('display_order', { ascending: true }),
    supabase.from('delivery_zones').select('*').order('name', { ascending: true }),
    supabase.from('delivery_fee_rules').select('*').order('display_order', { ascending: true }),
    supabase.from('packaging_fee_rules').select('*').order('fee_type', { ascending: true }),
    supabase.from('holiday_closures').select('*').order('date', { ascending: true })
  ]);

  const rawSettings = settingsRes.data || [];
  const systemSettings = rawSettings.reduce((acc: Record<string, any>, item: { key: string; value: any }) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

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
    />
  );
}
