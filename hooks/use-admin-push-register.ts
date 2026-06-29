'use client';

import { useEffect } from 'react';
import { subscribeToPushAction } from '@/app/admin/notifications/actions';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useAdminPushRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    if (!isSupported) return;

    const autoRegister = async () => {
      try {
        // If permission is already granted, verify we have a subscription
        // If permission is default, auto-prompt the user
        const currentPermission = Notification.permission;
        
        if (currentPermission === 'denied') {
          return; // Blocked by user
        }

        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          // Already subscribed, everything is set up
          return;
        }

        // If permission is default, or if we have permission but somehow lost the subscription:
        // We will prompt/register unless the user has actively opted out in this browser session.
        if (currentPermission === 'default') {
          const prompted = localStorage.getItem('admin_push_auto_prompted');
          if (prompted === 'true') {
            // Don't auto-prompt more than once to avoid annoying the user if they dismissed it
            return;
          }
          localStorage.setItem('admin_push_auto_prompted', 'true');
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('[Push Auto-Register] Permission denied or dismissed.');
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn('[Push Auto-Register] Public VAPID key is missing.');
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        const res = await subscribeToPushAction(
          subscription.toJSON() as any,
          'Auto-Registered Admin Device'
        );

        if (res.success) {
          console.log('[Push Auto-Register] Device registered successfully.');
        } else {
          console.error('[Push Auto-Register] Server registration failed:', res.error);
        }
      } catch (err) {
        console.error('[Push Auto-Register] Registration error:', err);
      }
    };

    // Delay slightly to let the page settle before requesting permissions
    const timer = setTimeout(autoRegister, 2000);
    return () => clearTimeout(timer);
  }, []);
}
