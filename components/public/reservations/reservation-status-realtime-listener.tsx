'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  reservationId: string;
};

export default function ReservationStatusRealtimeListener({ reservationId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to Postgres changes on the reservations table for this specific row
    const channel = supabase
      .channel(`public-reservation-status-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `id=eq.${reservationId}`
        },
        (payload) => {
          console.log('Realtime reservation update received:', payload.new?.status);
          // router.refresh forces Next.js to fetch the server page data again and re-render
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId, router]);

  return null;
}
