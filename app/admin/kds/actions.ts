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
    revalidatePath('/[locale]/order/status', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('kdsStartPreparingAction error:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

/**
 * Kitchen action: Mark order as ready / handed to courier.
 * Transition for takeaway: approved|preparing → ready_for_pickup
 * Transition for delivery: approved|preparing → out_for_delivery
 * Whitelist: only status, ready_at (takeaway), dispatched_at (delivery), updated_at
 *
 * For delivery orders, this means the food has been handed to the courier
 * or is leaving the restaurant. Do NOT use ready_for_pickup for delivery.
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

    const targetStatus = order.order_type === 'takeaway' ? 'ready_for_pickup' : 'out_for_delivery';
    if (order.status === targetStatus) {
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

    // Strict field whitelist: only status, ready_at/dispatched_at, updated_at
    // NEVER use ready_for_pickup for delivery orders
    if (order.order_type === 'takeaway') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'ready_for_pickup' as any,
          ready_at: now,
          updated_at: now
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('KDS mark ready (takeaway) failed:', updateError);
        return { success: false, error: 'Failed to update order status.' };
      }
    } else {
      // delivery → out_for_delivery (handed to courier)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'out_for_delivery' as any,
          dispatched_at: now,
          updated_at: now
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('KDS mark ready (delivery) failed:', updateError);
        return { success: false, error: 'Failed to update order status.' };
      }
    }

    revalidatePath('/admin/kds', 'layout');
    revalidatePath('/admin/orders', 'layout');
    revalidatePath('/[locale]/order/status', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('kdsMarkReadyAction error:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}
