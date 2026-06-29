'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'owner' | 'manager' | 'kitchen' | 'staff';

export function useAdminSidebarBadges() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const [ordersApprovalCount, setOrdersApprovalCount] = useState<number>(0);
  const [kdsCount, setKdsCount] = useState<number>(0);
  const [reservationsCount, setReservationsCount] = useState<number>(0);
  const [deliveryCount, setDeliveryCount] = useState<number>(0);

  const channelStatusRef = useRef<string>('INITIAL');
  const ordersDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const reservationsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  // 1. Fetch user role and activity state on mount & handle auth change
  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) {
            setRole(null);
            setIsActive(false);
            setLoading(false);
          }
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', user.id)
          .single();

        if (!active) return;

        if (error || !profile || !profile.is_active) {
          setRole(null);
          setIsActive(false);
        } else {
          setRole(profile.role as UserRole);
          setIsActive(profile.is_active);
        }
        setLoading(false);
      } catch (err) {
        console.error('[Sidebar Badges] Error fetching user profile:', err);
        if (active) setLoading(false);
      }
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Count Fetching Functions
  const fetchOrdersApprovalCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('order_type', ['delivery', 'takeaway']);

      if (!error && count !== null) {
        setOrdersApprovalCount(count);
      }
    } catch (err) {
      console.error('[Sidebar Badges] Error fetching pending orders count:', err);
    }
  }, [supabase]);

  const fetchKdsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (!error && count !== null) {
        setKdsCount(count);
      }
    } catch (err) {
      console.error('[Sidebar Badges] Error fetching KDS count:', err);
    }
  }, [supabase]);

  const fetchDeliveryCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ready_for_pickup')
        .eq('order_type', 'delivery');

      if (!error && count !== null) {
        setDeliveryCount(count);
      }
    } catch (err) {
      console.error('[Sidebar Badges] Error fetching delivery count:', err);
    }
  }, [supabase]);

  const fetchReservationsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error && count !== null) {
        setReservationsCount(count);
      }
    } catch (err) {
      console.error('[Sidebar Badges] Error fetching pending reservations count:', err);
    }
  }, [supabase]);

  // 3. Debounced Refetch triggers
  const triggerOrdersRefetch = useCallback(() => {
    if (ordersDebounceRef.current) clearTimeout(ordersDebounceRef.current);
    ordersDebounceRef.current = setTimeout(() => {
      if (role === 'owner' || role === 'manager') {
        fetchOrdersApprovalCount();
        fetchKdsCount();
        fetchDeliveryCount();
      } else if (role === 'kitchen') {
        fetchKdsCount();
      } else if (role === 'staff') {
        fetchDeliveryCount();
      }
    }, 300);
  }, [role, fetchOrdersApprovalCount, fetchKdsCount, fetchDeliveryCount]);

  const triggerReservationsRefetch = useCallback(() => {
    if (reservationsDebounceRef.current) clearTimeout(reservationsDebounceRef.current);
    reservationsDebounceRef.current = setTimeout(() => {
      if (role === 'owner' || role === 'manager') {
        fetchReservationsCount();
      }
    }, 300);
  }, [role, fetchReservationsCount]);

  // 4. Set up Realtime listener & Polling fallback
  useEffect(() => {
    if (loading || !isActive || !role) return;

    // Run initial fetches
    if (role === 'owner' || role === 'manager') {
      fetchOrdersApprovalCount();
      fetchKdsCount();
      fetchReservationsCount();
      fetchDeliveryCount();
    } else if (role === 'kitchen') {
      fetchKdsCount();
    } else if (role === 'staff') {
      fetchDeliveryCount();
    }

    const channel = supabase.channel('admin-sidebar-badges-channel');

    const canSeeOrders = ['owner', 'manager', 'kitchen'].includes(role);
    const canSeeReservations = ['owner', 'manager'].includes(role);

    if (canSeeOrders) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Sidebar Badges Realtime] orders change detected:', payload.eventType);
          triggerOrdersRefetch();
        }
      );
    }

    if (canSeeReservations) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          console.log('[Sidebar Badges Realtime] reservations change detected:', payload.eventType);
          triggerReservationsRefetch();
        }
      );
    }

    channel.subscribe((status) => {
      console.log('[Sidebar Badges Realtime] Channel status update:', status);
      channelStatusRef.current = status;
    });

    // Polling fallback runs only if disconnected (status is not SUBSCRIBED)
    const interval = setInterval(() => {
      if (channelStatusRef.current !== 'SUBSCRIBED') {
        console.log(`[Sidebar Badges Polling Fallback] Realtime channel is ${channelStatusRef.current}. Polling database counts...`);
        if (role === 'owner' || role === 'manager') {
          fetchOrdersApprovalCount();
          fetchKdsCount();
          fetchReservationsCount();
          fetchDeliveryCount();
        } else if (role === 'kitchen') {
          fetchKdsCount();
        } else if (role === 'staff') {
          fetchDeliveryCount();
        }
      }
    }, 20000); // 20 seconds polling fallback

    return () => {
      if (ordersDebounceRef.current) clearTimeout(ordersDebounceRef.current);
      if (reservationsDebounceRef.current) clearTimeout(reservationsDebounceRef.current);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [
    role,
    isActive,
    loading,
    fetchOrdersApprovalCount,
    fetchKdsCount,
    fetchDeliveryCount,
    fetchReservationsCount,
    triggerOrdersRefetch,
    triggerReservationsRefetch
  ]);

  return {
    ordersApprovalCount: (role === 'owner' || role === 'manager') ? ordersApprovalCount : 0,
    kdsCount: ['owner', 'manager', 'kitchen'].includes(role || '') ? kdsCount : 0,
    reservationsCount: (role === 'owner' || role === 'manager') ? reservationsCount : 0,
    deliveryCount: ['owner', 'manager', 'staff'].includes(role || '') ? deliveryCount : 0,
    role,
    loading
  };
}
