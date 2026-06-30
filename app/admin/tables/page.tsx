import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ROUTES } from '@/lib/routes/path';
import TablesManagement from '@/components/admin/tables/tables-management';

export const dynamic = 'force-dynamic';

export default async function AdminTablesPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const siteUrl = `${protocol}://${host}`;

  // 1. Authenticate user and check permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(ROUTES.admin.login);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active || (profile.role !== 'owner' && profile.role !== 'manager')) {
    redirect(ROUTES.admin.dashboard);
  }

  // 2. Fetch dining tables
  const { data: tables } = await supabase
    .from('dining_tables')
    .select('*')
    .order('table_number', { ascending: true });

  // 3. Fetch active table sessions
  const { data: activeSessions } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('status', 'active');

  // 4. Fetch active orders (dine-in only)
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, table_id, total_amount, status')
    .eq('order_type', 'dine_in')
    .in('status', ['pending', 'approved', 'preparing', 'ready_for_pickup']);



  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-serif font-black tracking-widest text-primary uppercase">
            Tables & QR Codes
          </h1>
          <p className="text-xs text-muted-foreground font-light uppercase tracking-wider mt-1">
            Manage restaurant dining tables and generate ordering QR codes
          </p>
        </div>
      </div>

      <TablesManagement
        initialTables={tables || []}
        initialSessions={activeSessions || []}
        initialOrders={activeOrders || []}
        siteUrl={siteUrl}
      />
    </div>
  );
}
