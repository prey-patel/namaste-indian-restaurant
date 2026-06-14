'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  sendOrderApprovedCustomerEmail,
  sendOrderRejectedCustomerEmail,
  sendOrderReadyForPickupCustomerEmail,
  sendOrderDeliveredCustomerEmail
} from '@/lib/email/send-order-emails';


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
 * Helper to fetch an order by ID.
 */
async function getOrder(supabase: any, id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('Order not found');
  }

  return data;
}

/**
 * Sanitizes input text by removing HTML tags.
 */
function sanitizeInput(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.replace(/<[^>]*>/g, '').trim();
}

export async function confirmOrderAction(id: string, etaMinutes: number) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    if (order.status !== 'pending') {
      throw new Error(`Cannot confirm order from status: ${order.status}`);
    }

    if (etaMinutes <= 0 || etaMinutes > 360) {
      throw new Error('Please select a valid estimated duration (between 1 and 360 minutes)');
    }

    const now = new Date();
    const estimatedTime = new Date(now.getTime() + etaMinutes * 60000);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'approved', // database confirm status is 'approved'
        estimated_time: estimatedTime.toISOString(),
        approved_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in confirmOrderAction:', updateError);
      throw new Error('Failed to update order status in database');
    }

    // Trigger customer email notification
    await sendOrderApprovedCustomerEmail(id);

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to confirm order:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}


export async function rejectOrderAction(id: string, reason?: string | null) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    if (order.status !== 'pending') {
      throw new Error(`Cannot reject order from status: ${order.status}`);
    }

    const sanitizedReason = sanitizeInput(reason);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
        rejection_reason: sanitizedReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in rejectOrderAction:', updateError);
      throw new Error('Failed to reject order');
    }

    // Trigger customer email notification
    await sendOrderRejectedCustomerEmail(id);

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to reject order:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}


export async function cancelOrderAction(id: string, reason?: string | null) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    const allowedStatuses = ['pending', 'approved', 'preparing'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order from status: ${order.status}`);
    }

    const sanitizedReason = sanitizeInput(reason);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: sanitizedReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in cancelOrderAction:', updateError);
      throw new Error('Failed to cancel order');
    }

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to cancel order:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

export async function markOrderReadyAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    const allowedStatuses = ['approved', 'preparing'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`Cannot mark order ready from status: ${order.status}`);
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updated_at: now
    };

    if (order.order_type === 'takeaway') {
      updatePayload.status = 'ready_for_pickup';
      updatePayload.ready_at = now;
    } else {
      // order.order_type === 'delivery'
      updatePayload.status = 'out_for_delivery';
      updatePayload.dispatched_at = now;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in markOrderReadyAction:', updateError);
      throw new Error('Failed to update order status');
    }

    if (order.order_type === 'takeaway') {
      await sendOrderReadyForPickupCustomerEmail(id);
    }

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to mark order ready:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}


export async function completeOrderAction(id: string, paymentReceived: boolean) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    const allowedStatuses = ['ready_for_pickup', 'out_for_delivery'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`Cannot complete order from status: ${order.status}`);
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: 'completed',
      completed_at: now,
      updated_at: now
    };

    if (paymentReceived) {
      updatePayload.payment_status = 'paid';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in completeOrderAction:', updateError);
      throw new Error('Failed to complete order');
    }

    if (order.order_type === 'delivery') {
      await sendOrderDeliveredCustomerEmail(id);
    }

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to complete order:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}


export async function updateOrderEtaAction(id: string, etaMinutes: number) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    const allowedStatuses = ['approved', 'preparing'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`Cannot update ETA for order in status: ${order.status}`);
    }

    if (etaMinutes <= 0 || etaMinutes > 360) {
      throw new Error('Please select a valid estimated duration (between 1 and 360 minutes)');
    }

    const now = new Date();
    const estimatedTime = new Date(now.getTime() + etaMinutes * 60000);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        estimated_time: estimatedTime.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in updateOrderEtaAction:', updateError);
      throw new Error('Failed to update estimated time');
    }

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update ETA:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}

export async function startPreparingOrderAction(id: string) {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    if (order.status !== 'approved') {
      throw new Error(`Cannot start preparing order from status: ${order.status}`);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'preparing',
        preparing_at: now,
        updated_at: now
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in startPreparingOrderAction:', updateError);
      throw new Error('Failed to update order status to preparing');
    }

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to start preparing order:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}
