'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Validates that the current user is authenticated and has an active
 * owner, manager, or kitchen role. Staff and public are blocked.
 */
async function validateKdsAccess() {
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
    throw new Error('Unauthorized: Profile not found');
  }

  if (!profile.is_active) {
    throw new Error('Unauthorized: Account is inactive');
  }

  const allowedRoles = ['owner', 'manager', 'kitchen'];
  if (!allowedRoles.includes(profile.role)) {
    throw new Error('Unauthorized: Insufficient permissions for KDS');
  }

  return { userId: user.id, role: profile.role };
}

/**
 * Kitchen action: Start preparing an order.
 * Transition: approved → preparing
 * Whitelist: only status, preparing_at, updated_at
 */
export async function kdsStartPreparingAction(orderId: string) {
  try {
    await validateKdsAccess();
    const supabase = await createClient();

    // Fetch order to validate current status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found.' };
    }

    if (order.status === 'preparing') {
      return { success: true };
    }

    if (order.status !== 'approved') {
      return {
        success: false,
        error: `Cannot start preparing from status: ${order.status}. Order must be confirmed first.`
      };
    }

    const now = new Date().toISOString();

    // Strict field whitelist: only status, preparing_at, updated_at
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'preparing' as any,
        preparing_at: now,
        updated_at: now
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('KDS start preparing failed:', updateError);
      return { success: false, error: 'Failed to update order status.' };
    }

    revalidatePath('/admin/kds', 'layout');
    revalidatePath('/admin/orders', 'layout');
    revalidatePath('/admin/delivery', 'layout');
    revalidatePath('/[locale]/order/status', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('kdsStartPreparingAction error:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

/**
 * Kitchen action: Mark order as ready for pickup/handoff.
 * Transition: approved|preparing → ready_for_pickup (both takeaway and delivery)
 * Whitelist: only status, ready_at, updated_at
 *
 * For delivery orders, this means the food is ready and waiting for a driver
 * to accept it via the Delivery Dispatch Dashboard. The driver will transition
 * the order to out_for_delivery via acceptDeliveryAction.
 */
export async function kdsMarkReadyAction(orderId: string) {
  try {
    await validateKdsAccess();
    const supabase = await createClient();

    // Fetch order to validate current status and type
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, order_type')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found.' };
    }

    // Both takeaway and delivery orders go to ready_for_pickup
    if (order.status === 'ready_for_pickup') {
      return { success: true };
    }

    const allowedStatuses = ['approved', 'preparing'];
    if (!allowedStatuses.includes(order.status)) {
      return {
        success: false,
        error: `Cannot mark ready from status: ${order.status}. Order must be confirmed or preparing.`
      };
    }

    const now = new Date().toISOString();

    // Strict field whitelist: only status, ready_at, updated_at
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'ready_for_pickup' as any,
        ready_at: now,
        updated_at: now
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('KDS mark ready failed:', updateError);
      return { success: false, error: 'Failed to update order status.' };
    }

    revalidatePath('/admin/kds', 'layout');
    revalidatePath('/admin/orders', 'layout');
    revalidatePath('/admin/delivery', 'layout');
    revalidatePath('/[locale]/order/status', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('kdsMarkReadyAction error:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}
