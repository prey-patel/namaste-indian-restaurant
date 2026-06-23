import { useEffect, useRef } from 'react';

/**
 * Custom hook to keep the device screen awake.
 * Requests a Wake Lock when the tab is visible and active.
 * Automatically releases the lock when hidden, and re-acquires it on return.
 */
export function useScreenWakeLock() {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      console.warn('[Wake Lock] Screen Wake Lock API is not supported on this browser.');
      return;
    }

    const requestWakeLock = async () => {
      try {
        // If we already hold a lock, do not request again
        if (wakeLockRef.current) return;

        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[Wake Lock] Screen Wake Lock acquired successfully.');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('[Wake Lock] Screen Wake Lock was released.');
          wakeLockRef.current = null;
        });
      } catch (err: any) {
        console.warn(`[Wake Lock] Failed to acquire lock: ${err.name}, ${err.message}`);
      }
    };

    // Re-acquire the lock if the user returns to the tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
}
