'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  sendOrderApprovedCustomerEmail,
  sendOrderRejectedCustomerEmail,
  sendOrderReadyForPickupCustomerEmail,
  sendOrderDeliveredCustomerEmail
} from '@/lib/email/send-order-emails';
import { validateAdminAccess, validateDeliveryAccess } from '@/lib/auth/guards';

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

    if (order.status === 'approved') {
      return { success: true };
    }

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

    // Trigger PWA push notifications (non-blocking, isolated)
    try {
      const { dispatchOrderPush } = await import('@/lib/push/dispatch-order-push');
      await dispatchOrderPush(id, 'approved-kds');
    } catch (pushErr) {
      console.error('Failed to dispatch approved order push alert:', pushErr);
    }

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

    if (order.status === 'rejected') {
      return { success: true };
    }

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

    if (order.status === 'cancelled') {
      return { success: true };
    }

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

    // Both takeaway and delivery orders go to ready_for_pickup
    // Delivery orders will be transitioned to out_for_delivery via acceptDeliveryAction
    if (order.status === 'ready_for_pickup') {
      return { success: true };
    }

    const allowedStatuses = ['approved', 'preparing'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(`Cannot mark order ready from status: ${order.status}`);
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'ready_for_pickup',
        ready_at: now,
        updated_at: now
      })
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
    revalidatePath('/admin/delivery', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to mark order ready:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}


/**
 * Accept a delivery order for dispatch.
 * Transition: ready_for_pickup → out_for_delivery
 * Only for delivery order_type. Used by delivery drivers/staff.
 */
export async function acceptDeliveryAction(id: string) {
  try {
    await validateDeliveryAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    if (order.status === 'out_for_delivery') {
      return { success: true };
    }

    if (order.status !== 'ready_for_pickup') {
      return { success: false, error: `Cannot dispatch order from status: ${order.status}. Order must be ready for pickup first.` };
    }

    if (order.order_type !== 'delivery') {
      return { success: false, error: 'Only delivery orders can be dispatched.' };
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'out_for_delivery',
        dispatched_at: now,
        updated_at: now
      })
      .eq('id', id);

    if (updateError) {
      console.error('Database update failed in acceptDeliveryAction:', updateError);
      return { success: false, error: 'Failed to dispatch order.' };
    }

    revalidatePath('/[locale]/order/status', 'layout');
    revalidatePath('/admin/orders', 'layout');
    revalidatePath('/admin/delivery', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to accept delivery:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}


export async function completeOrderAction(id: string, paymentReceived: boolean) {
  try {
    await validateDeliveryAccess();
    const supabase = await createClient();

    const order = await getOrder(supabase, id);

    if (order.status === 'completed') {
      return { success: true };
    }

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
    revalidatePath('/admin/delivery', 'layout');
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

    if (order.status === 'preparing') {
      return { success: true };
    }

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

export async function recalculateOrderDistanceAction(id: string) {
  try {
    await validateAdminAccess();
    const { refreshOrderDeliveryDistance } = await import('@/lib/delivery/distance');
    const success = await refreshOrderDeliveryDistance(id);
    if (!success) {
      throw new Error('Distance calculation failed. Please verify address details manually.');
    }
    revalidatePath(`/admin/orders/${id}`, 'page');
    revalidatePath('/admin/orders', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to recalculate distance:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}
