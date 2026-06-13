import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ItemForm from '@/components/admin/menu/item-form';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditMenuItemPage({ params }: Props) {
  const { id } = await params;

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

  // Load the menu item by ID
  const { data: item, error: itemError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (itemError || !item) {
    console.error('Error fetching menu item for edit:', itemError);
    notFound();
  }

  // Load categories for selector dropdown
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name_pl, name_en')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true });

  if (catError) {
    console.error('Error fetching categories for selector:', catError);
  }

  // Format price output to plain javascript number just in case pg returns it as string (numeric type)
  const formattedItem = {
    ...item,
    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-primary">Edytuj Danie w Menu / Edit Menu Item</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Zmodyfikuj parametry potrawy, zdjęcie i sprawdź podgląd w czasie rzeczywistym.
        </p>
      </div>
      <ItemForm categories={categories || []} initialData={formattedItem} />
    </div>
  );
}
