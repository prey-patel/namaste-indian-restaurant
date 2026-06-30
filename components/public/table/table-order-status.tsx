'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  tableSessionId: string;
  initialOrders: any[];
  onOrdersUpdate: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function TableOrderStatus({ tableSessionId, initialOrders, onOrdersUpdate }: Props) {
  useEffect(() => {
    if (!tableSessionId) return;

    const supabase = createClient();

    // Subscribe to public_order_status table updates
    const channel = supabase
      .channel(`session-status-${tableSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'public_order_status'
        },
        (payload: any) => {
          const updatedId = payload.new?.id || payload.old?.id;
          const newStatus = payload.new?.status;

          if (updatedId) {
            onOrdersUpdate(prev => 
              prev.map(order => 
                order.id === updatedId 
                  ? { ...order, status: newStatus || order.status } 
                  : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableSessionId, onOrdersUpdate]);

  return null;
}
