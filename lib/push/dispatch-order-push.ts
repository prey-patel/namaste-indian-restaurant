import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveSubscriptionsForRoles, removePushSubscription, updateSubscriptionLastUsed } from './subscriptions';
import { sendWebPush } from './web-push';

export type PushEventType = 'pending-admin' | 'approved-kds';

/**
 * Dispatches PWA Web Push notifications for order events.
 * Implements strict database-level idempotency checks.
 * Completely safe and isolated: failures will log but never throw.
 */
export async function dispatchOrderPush(
  orderId: string,
  eventType: PushEventType
): Promise<{ success: boolean; dispatchedCount: number; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch order details securely
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, order_type, token, customer_name, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.warn(`[Push Dispatch] Order ${orderId} not found. Skipping push alerts.`);
      return { success: false, dispatchedCount: 0, error: 'Order not found' };
    }

    // 2. Set event parameters
    let title: string;
    let body: string;
    let targetRoles: string[];
    let clickPath: string;

    if (eventType === 'pending-admin') {
      const typeStr = order.order_type === 'delivery' ? 'Delivery' : 'Takeaway';
      title = `New ${typeStr} Order 🔔`;
      body = `${order.customer_name || 'Customer'} • ${Number(order.total_amount || 0).toFixed(2)} PLN`;
      targetRoles = ['owner', 'manager'];
      clickPath = '/admin/orders';
    } else if (eventType === 'approved-kds') {
      title = `Kitchen Order Approved 🍳`;
      body = `Order #${order.token || 'N/A'} is ready for preparation.`;
      targetRoles = ['kitchen', 'manager', 'owner'];
      clickPath = '/admin/kds';
    } else {
      return { success: false, dispatchedCount: 0, error: 'Invalid event type' };
    }

    const eventKey = `order:${orderId}:${eventType}`;

    // 3. Fetch all active subscriptions matching authorized roles
    const subscriptions = await getActiveSubscriptionsForRoles(targetRoles);
    if (subscriptions.length === 0) {
      return { success: true, dispatchedCount: 0 };
    }

    let dispatchedCount = 0;

    // 4. Send pushes with transactional idempotency checks
    for (const sub of subscriptions) {
      const recipientUserId = sub.user_id;

      try {
        // Try to insert a pending log first.
        // The unique constraint on (event_key, recipient_user_id) prevents double-sending.
        const { data: logRecord, error: insertError } = await adminClient
          .from('push_notification_logs')
          .insert({
            event_key: eventKey,
            entity_type: 'order',
            entity_id: orderId,
            recipient_user_id: recipientUserId,
            role_target: sub.role,
            status: 'pending',
            metadata: {
              clickPath,
              subscriptionId: sub.id
            }
          })
          .select('id')
          .single();

        if (insertError) {
          // Unique constraint violation means we already attempted or sent this push. Skip.
          if (insertError.code === '23505') {
            console.log(`[Push Dispatch] Duplicate push alert blocked for user ${recipientUserId} on event ${eventKey}`);
            continue;
          }
          console.error(`[Push Dispatch] Failed to create log for user ${recipientUserId}:`, insertError);
          continue;
        }

        // Send push alert
        await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          title,
          body,
          {
            clickPath,
            orderId
          }
        );

        // Update log to sent
        await adminClient
          .from('push_notification_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', logRecord.id);

        // Update subscription last used timestamp
        await updateSubscriptionLastUsed(sub.id);
        dispatchedCount++;

      } catch (err: any) {
        console.error(`[Push Dispatch] Error sending push to user ${recipientUserId}:`, err);

        // Handle expired or defunct push subscriptions (Web Push standard: 410 Gone or 404 Not Found)
        const isDefunct = err.statusCode === 410 || err.statusCode === 404;
        if (isDefunct) {
          console.log(`[Push Dispatch] Subscription for user ${recipientUserId} is defunct (status ${err.statusCode}). Deactivating.`);
          await removePushSubscription(sub.endpoint);
        }

        // Update log with failure
        await adminClient
          .from('push_notification_logs')
          .update({
            status: 'failed',
            error_message: err.message || 'Network dispatch failure'
          })
          .eq('event_key', eventKey)
          .eq('recipient_user_id', recipientUserId);
      }
    }

    return { success: true, dispatchedCount };
  } catch (globalErr: any) {
    // Fail-silent isolation block: never let notifications break order processing
    console.error('[Push Dispatch] Critical error in push notification dispatcher:', globalErr);
    return { success: false, dispatchedCount: 0, error: globalErr.message };
  }
}
