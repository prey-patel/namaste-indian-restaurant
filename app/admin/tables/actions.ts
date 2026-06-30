'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Checks if the current user is authenticated and has owner or manager roles.
 */
async function validateAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Unauthenticated user');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Unauthorized: Admin profile not found');
  }

  if (!profile.is_active) {
    throw new Error('Unauthorized: Admin account is inactive');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return user.id;
}

export async function createTableAction(tableNumber: number, capacity: number, section: string, notes?: string | null) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const qrToken = crypto.randomBytes(6).toString('hex'); // 12-char URL safe hex token

    const { error } = await supabase
      .from('dining_tables')
      .insert({
        table_number: tableNumber,
        capacity,
        section,
        notes: notes || null,
        is_active: true,
        qr_token: qrToken
      });

    if (error) {
      console.error('Database error in createTableAction:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tables', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to create table:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

export async function updateTableAction(id: string, updates: { table_number?: number; capacity?: number; section?: string; notes?: string | null; is_active?: boolean }) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const { error } = await supabase
      .from('dining_tables')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Database error in updateTableAction:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tables', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update table:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

export async function deleteTableAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    // Check if table has orders
    const { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      // If table has orders, don't hard delete it, just set is_active to false
      const { error } = await supabase
        .from('dining_tables')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      revalidatePath('/admin/tables', 'layout');
      return { success: true, message: 'Table contains order history. Deactivated table instead.' };
    }

    const { error } = await supabase
      .from('dining_tables')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error in deleteTableAction:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tables', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete table:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

export async function regenerateQrTokenAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const newQrToken = crypto.randomBytes(6).toString('hex');

    const { error } = await supabase
      .from('dining_tables')
      .update({ qr_token: newQrToken })
      .eq('id', id);

    if (error) {
      console.error('Database error in regenerateQrTokenAction:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tables', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to regenerate QR token:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

export async function closeTableSessionAction(sessionId: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const now = new Date().toISOString();

    const { error: sessionError } = await supabase
      .from('table_sessions')
      .update({
        status: 'closed',
        closed_at: now
      })
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Database error closing table session:', sessionError);
      return { success: false, error: sessionError.message };
    }

    // Mark all active orders for this session as completed
    const { error: ordersError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: now,
        payment_status: 'paid', // Auto mark as paid on session close
        updated_at: now
      })
      .eq('table_session_id', sessionId)
      .in('status', ['pending', 'approved', 'preparing', 'ready_for_pickup']);

    if (ordersError) {
      console.error('Error completing orders for closed session:', ordersError);
    }

    revalidatePath('/admin/tables', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to close table session:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}
