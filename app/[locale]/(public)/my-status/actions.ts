'use server';

import { createAdminClient } from '@/lib/supabase/admin';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function lookupStatusAction(rawToken: string, locale: 'pl' | 'en') {
  try {
    const token = rawToken.trim();
    if (!token || !uuidRegex.test(token)) {
      return {
        success: false,
        error: locale === 'pl' 
          ? 'Wprowadź poprawny 36-znakowy numer referencyjny (UUID).' 
          : 'Please enter a valid 36-character reference number (UUID).'
      };
    }

    const adminClient = createAdminClient();

    // 1. Search in orders table (id or token)
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('id, token')
      .or(`id.eq.${token},token.eq.${token}`)
      .maybeSingle();

    if (!orderErr && order) {
      return {
        success: true,
        type: 'order',
        id: order.id,
        token: order.token
      };
    }

    // 2. Search in reservations table (id or token)
    const { data: reservation, error: resErr } = await adminClient
      .from('reservations')
      .select('id, token')
      .or(`id.eq.${token},token.eq.${token}`)
      .maybeSingle();

    if (!resErr && reservation) {
      return {
        success: true,
        type: 'reservation',
        id: reservation.id,
        token: reservation.token
      };
    }

    return {
      success: false,
      error: locale === 'pl'
        ? 'Nie znaleziono zamówienia ani rezerwacji o podanym kodzie.'
        : 'No order or reservation found matching this reference code.'
    };

  } catch (err: any) {
    console.error('Lookup status action error:', err);
    return {
      success: false,
      error: locale === 'pl' ? 'Wystąpił błąd podczas wyszukiwania.' : 'An error occurred during lookup.'
    };
  }
}
