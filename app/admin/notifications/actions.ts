'use server';

import { createClient } from '@/lib/supabase/server';
import { savePushSubscription, removePushSubscription } from '@/lib/push/subscriptions';
import { headers } from 'next/headers';
import { validateUserAccess } from '@/lib/auth/guards';

/**
 * Saves a browser push subscription for the logged-in admin user.
 */
export async function subscribeToPushAction(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceLabel?: string | null
) {
  try {
    const { userId, role } = await validateUserAccess();
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'unknown';

    return await savePushSubscription(userId, role, subscription, userAgent, deviceLabel);
  } catch (err: any) {
    console.error('subscribeToPushAction error:', err);
    return { success: false, error: err.message || 'Authentication required' };
  }
}

/**
 * Deactivates a push subscription for the logged-in user.
 */
export async function unsubscribeFromPushAction(endpoint: string) {
  try {
    const { userId } = await validateUserAccess();
    return await removePushSubscription(endpoint, userId);
  } catch (err: any) {
    console.error('unsubscribeFromPushAction error:', err);
    return { success: false, error: err.message || 'Authentication required' };
  }
}


