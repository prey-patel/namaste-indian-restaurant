'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  tables: string[];
  channelName: string;
  debounceMs?: number;
  pollingIntervalMs?: number; // fallback polling
};

export default function RealtimeTableListener({
  tables,
  channelName,
  debounceMs = 1000,
  pollingIntervalMs = 20000 // default 20 seconds polling fallback
}: Props) {
  const router = useRouter();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<string>('INITIAL');

  // Debounced refresh function
  const triggerRefresh = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      console.log(`[Realtime/Poll] Triggering path revalidation and refresh...`);
      router.refresh();
    }, debounceMs);
  }, [router, debounceMs]);

  useEffect(() => {
    if (tables.length === 0) return;
    const supabase = createClient();
    
    // Set up Supabase Realtime channel
    const channel = supabase.channel(channelName);
    
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.log(`[Realtime] Change detected in table '${table}':`, payload.eventType);
          triggerRefresh();
        }
      );
    });

    channel.subscribe((status) => {
      console.log(`[Realtime] Channel '${channelName}' status:`, status);
      statusRef.current = status;
    });

    // Polling fallback: runs ONLY when Realtime is not fully subscribed (disconnected / error / closed)
    const pollInterval = setInterval(() => {
      if (statusRef.current !== 'SUBSCRIBED') {
        console.log(`[Realtime Polling Fallback] Realtime channel '${channelName}' is not subscribed (status: ${statusRef.current}). Checking for updates...`);
        triggerRefresh();
      }
    }, pollingIntervalMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [tables, channelName, pollingIntervalMs, triggerRefresh]);

  return null;
}
