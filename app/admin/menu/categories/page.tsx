import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CategoriesCmsClient from '@/components/admin/menu/categories-cms-client';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login');
  }

  // Fetch role and active status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active || (profile.role !== 'owner' && profile.role !== 'manager')) {
    redirect('/admin/login');
  }

  // Load non-deleted categories sorted by display order
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('is_deleted', false)
    .order('display_order', { ascending: true });

  if (catError) {
    console.error('Error fetching categories:', catError);
  }

  return (
    <CategoriesCmsClient categories={categories || []} />
  );
}
