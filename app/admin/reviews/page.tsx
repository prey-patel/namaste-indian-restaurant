import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReviewsDashboard from '@/components/admin/reviews/reviews-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth check
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Role check (owner, manager, staff)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    redirect('/admin/login');
  }

  const allowedRoles = ['owner', 'manager', 'staff'];
  if (!allowedRoles.includes(profile.role)) {
    redirect('/admin');
  }

  // 3. Fetch reviews from db
  const { data: reviews, error: dbError } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      order_id,
      orders (
        id,
        token,
        customer_name,
        customer_email,
        customer_phone,
        order_type,
        status,
        total_amount
      )
    `)
    .order('created_at', { ascending: false });

  if (dbError) {
    console.error('Error fetching reviews:', dbError);
  }

  return (
    <ReviewsDashboard
      initialReviews={(reviews || []) as any[]}
    />
  );
}
