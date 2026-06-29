import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import InquiriesDashboard from '@/components/admin/inquiries/inquiries-dashboard';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    status?: string;
    query?: string;
  }>;
};

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth check
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check (owner or manager)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    redirect('/admin/login');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    redirect('/admin/login');
  }

  // 3. Gather statistics
  const [
    newInq,
    repliedInq,
    archivedInq,
    allInq
  ] = await Promise.all([
    supabase
      .from('contact_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('contact_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'replied'),
    supabase
      .from('contact_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'archived'),
    supabase
      .from('contact_inquiries')
      .select('id', { count: 'exact', head: true })
  ]);

  const metrics = {
    newCount: newInq.count || 0,
    repliedCount: repliedInq.count || 0,
    archivedCount: archivedInq.count || 0,
    totalCount: allInq.count || 0,
  };

  // 4. Build the query
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams.status || 'new';
  const query = resolvedSearchParams.query || '';

  let queryBuilder = supabase
    .from('contact_inquiries')
    .select(`
      id, name, email, phone, subject, message, status, source_language, 
      admin_reply, replied_at, replied_by, created_at, updated_at
    `)
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%,subject.ilike.%${query}%,message.ilike.%${query}%`);
  }

  const { data: inquiries, error: dbError } = await queryBuilder;

  if (dbError) {
    console.error('Error fetching inquiries list:', dbError);
  }

  return (
    <InquiriesDashboard
      initialInquiries={(inquiries || []) as any[]}
      metrics={metrics}
      filters={{
        status,
        query
      }}
    />
  );
}
