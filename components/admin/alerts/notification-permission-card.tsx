'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, BellOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { subscribeToPushAction, unsubscribeFromPushAction } from '@/app/admin/notifications/actions';

interface Props {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onUnlockAudio: () => void;
  alertType: 'admin' | 'kds';
}

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

export default function NotificationPermissionCard({
  soundEnabled,
  onToggleSound,
  onUnlockAudio,
  alertType
}: Props) {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Detect push notification support and current subscription status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(isSupported);

    if (isSupported) {
      setPermissionState(Notification.permission);
      
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setPushEnabled(!!subscription);
        });
      });
    }
  }, []);

  const handleTogglePush = async () => {
    if (!pushSupported || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await unsubscribeFromPushAction(subscription.endpoint);
        }
        setPushEnabled(false);
      } else {
        // Request Permission
        const permission = await Notification.requestPermission();
        setPermissionState(permission);

        if (permission !== 'granted') {
          throw new Error('Notification permission denied by browser.');
        }

        // Subscribe
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID configuration error: Public key missing.');
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Save subscription on server
        const res = await subscribeToPushAction(subscription.toJSON() as any, `Device (${alertType})`);
        if (!res.success) {
          throw new Error(res.error || 'Failed to save subscription on server.');
        }

        setPushEnabled(true);
      }
    } catch (err: any) {
      console.error('Failed to toggle push notifications:', err);
      setErrorMessage(err.message || 'Push registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioEnableClick = () => {
    onUnlockAudio();
    onToggleSound();
  };

  return (
    <div className="bg-card border border-border p-6 rounded-lg shadow-sm max-w-xl font-sans">
      <div className="flex items-center space-x-3 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          {alertType === 'admin' ? 'Order Alerts Center' : 'Kitchen Alerts Center'}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* In-app Audio Controls */}
        <button
          onClick={handleAudioEnableClick}
          className={`flex items-center justify-between p-4 rounded border transition-all duration-300 ${
            soundEnabled
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-xs font-bold uppercase tracking-wide">
              {alertType === 'admin' ? 'Looping Sound' : 'One-time Sound'}
            </span>
            <span className="text-[10px] opacity-75 mt-0.5">
              {soundEnabled ? 'Enabled on this tab' : 'Disabled / Blocked'}
            </span>
          </div>
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Web Push Controls */}
        <button
          onClick={handleTogglePush}
          disabled={!pushSupported || isLoading}
          className={`flex items-center justify-between p-4 rounded border transition-all duration-300 ${
            !pushSupported
              ? 'bg-muted/10 border-dashed border-border opacity-50 cursor-not-allowed text-muted-foreground'
              : pushEnabled
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-xs font-bold uppercase tracking-wide">Web Push Alerts</span>
            <span className="text-[10px] opacity-75 mt-0.5">
              {!pushSupported
                ? 'Unsupported on device'
                : pushEnabled
                ? 'Device registered'
                : 'Offline / Background alerts'}
            </span>
          </div>
          {pushEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Permissions / Warning Banners */}
      {permissionState === 'denied' && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Notifications Blocked by Browser</p>
            <p className="mt-1">
              Please click the site settings icon in your browser URL bar and allow &quot;Notifications&quot; to receive background/lock-screen alerts.
            </p>
          </div>
        </div>
      )}

      {!pushSupported && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400 rounded text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Device Support Limitation</p>
            <p className="mt-1 font-light">
              iOS devices require this web app to be added to your Home Screen (using the Share button) before Web Push notifications can be authorized.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs font-mono">
          Error: {errorMessage}
        </div>
      )}
    </div>
  );
}
