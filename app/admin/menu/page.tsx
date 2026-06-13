import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MenuCmsClient from '@/components/admin/menu/menu-cms-client';

export const dynamic = 'force-dynamic';

export default async function AdminMenuCmsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login');
  }

  // Fetch role and active status from public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/admin/login');
  }

  if (!profile.is_active) {
    redirect('/admin/login');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    // Only active owner or manager profiles can access
    redirect('/admin/login');
  }

  // Load non-deleted categories sorted by display order
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('is_deleted', false)
    .order('display_order', { ascending: true });

  if (catError) {
    console.error('Error fetching categories in Admin CMS:', catError);
  }

  // Load non-deleted menu items sorted by display order
  const { data: items, error: itemError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_deleted', false)
    .order('display_order', { ascending: true });

  if (itemError) {
    console.error('Error fetching menu items in Admin CMS:', itemError);
  }

  // Format price output to plain javascript number just in case pg returns it as string (numeric type)
  const formattedItems = (items || []).map((item) => ({
    ...item,
    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
  }));

  return (
    <MenuCmsClient
      categories={categories || []}
      items={formattedItems}
    />
  );
}
