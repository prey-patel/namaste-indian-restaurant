import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ItemForm from '@/components/admin/menu/item-form';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function AdminNewMenuItemPage() {
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

  // Load categories for the selector dropdown
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name_pl, name_en')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true });

  if (catError) {
    console.error('Error fetching categories for selector:', catError);
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pl';
  const isEn = locale === 'en';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-primary">
          {isEn ? 'New Menu Item' : 'Nowe Danie w Menu'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isEn
            ? 'Add a new dish to the menu card. Set parameters, image, and check the real-time preview.'
            : 'Dodaj nową potrawę do karty dań. Ustaw parametry, zdjęcie i sprawdź podgląd w czasie rzeczywistym.'}
        </p>
      </div>
      <ItemForm categories={categories || []} />
    </div>
  );
}
