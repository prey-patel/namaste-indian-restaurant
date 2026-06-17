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
    
    // Subscribe to Postgres changes on the public_reservation_status table for this specific row
    const channel = supabase
      .channel(`public-reservation-status-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'public_reservation_status',
          filter: `id=eq.${reservationId}`
        },
        (payload: any) => {
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
