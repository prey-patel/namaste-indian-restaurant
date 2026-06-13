'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Checks if the current request is authenticated and has owner or manager roles.
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

/**
 * Helper to fetch a reservation by ID and check its existence.
 */
async function getReservation(supabase: any, id: string) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('Reservation not found');
  }

  return data;
}

/**
 * Helper to validate a dining table exists, is active, and has enough capacity.
 */
async function validateDiningTable(supabase: any, tableId: string, guestsCount: number) {
  const { data: table, error } = await supabase
    .from('dining_tables')
    .select('*')
    .eq('id', tableId)
    .single();

  if (error || !table) {
    throw new Error('Selected dining table does not exist');
  }

  if (!table.is_active) {
    throw new Error('Selected dining table is inactive/not reservable');
  }

  if (table.capacity < guestsCount) {
    throw new Error(`Table capacity (${table.capacity}) is less than guests count (${guestsCount})`);
  }

  return table;
}

export async function confirmReservationAction(id: string, tableId?: string | null) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    // Validate status transition
    if (reservation.status !== 'pending') {
      throw new Error(`Cannot confirm reservation from status: ${reservation.status}`);
    }

    const updatePayload: Record<string, any> = { status: 'confirmed' };

    if (tableId) {
      await validateDiningTable(supabase, tableId, reservation.guests_count);
      updatePayload.table_id = tableId;
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database update failed');
    }

    revalidatePath('/[locale]/reservations', 'layout');
    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to confirm reservation:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function rejectReservationAction(id: string, reason?: string | null) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    // Validate status transition
    if (reservation.status !== 'pending') {
      throw new Error(`Cannot reject reservation from status: ${reservation.status}`);
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'rejected',
        rejection_reason: reason ? reason.replace(/<[^>]*>/g, '') : null
      })
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database update failed');
    }

    revalidatePath('/[locale]/reservations', 'layout');
    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to reject reservation:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function cancelReservationAction(id: string, reason?: string | null) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    // Validate status transition: only confirmed reservations can be cancelled
    if (reservation.status !== 'confirmed' && reservation.status !== 'pending') {
      throw new Error(`Cannot cancel reservation from status: ${reservation.status}`);
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: reason ? reason.replace(/<[^>]*>/g, '') : null
      })
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database update failed');
    }

    revalidatePath('/[locale]/reservations', 'layout');
    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to cancel reservation:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function completeReservationAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    // Validate status transition: only confirmed can be completed
    if (reservation.status !== 'confirmed') {
      throw new Error(`Cannot complete reservation from status: ${reservation.status}`);
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'completed' })
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database update failed');
    }

    revalidatePath('/[locale]/reservations', 'layout');
    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to complete reservation:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function markNoShowAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    // Validate status transition: only confirmed can go to no-show
    if (reservation.status !== 'confirmed') {
      throw new Error(`Cannot mark reservation as no-show from status: ${reservation.status}`);
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'no_show' })
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database update failed');
    }

    revalidatePath('/[locale]/reservations', 'layout');
    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to mark as no-show:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function assignReservationTableAction(id: string, tableId: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    // Validate status: can only assign table for pending or confirmed reservations
    if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
      throw new Error(`Cannot assign table for reservation in status: ${reservation.status}`);
    }

    await validateDiningTable(supabase, tableId, reservation.guests_count);

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ table_id: tableId })
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database table assignment failed');
    }

    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to assign table:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

export async function removeReservationTableAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const reservation = await getReservation(supabase, id);

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ table_id: null })
      .eq('id', id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Database table removal failed');
    }

    revalidatePath('/admin/reservations', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to remove table assignment:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}
