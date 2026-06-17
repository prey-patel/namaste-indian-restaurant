'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  orderId: string;
};

export default function OrderStatusRealtimeListener({ orderId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to Postgres changes on the orders table for this specific row
    const channel = supabase
      .channel(`public-order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Realtime order update received:', payload.new?.status);
          // router.refresh forces Next.js to fetch the server page data again and re-render
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return null;
}
