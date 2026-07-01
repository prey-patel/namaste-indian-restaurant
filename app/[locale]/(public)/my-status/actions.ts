'use server';

import { createAdminClient } from '@/lib/supabase/admin';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function lookupStatusAction(rawToken: string, locale: 'pl' | 'en') {
  try {
    const token = rawToken.replace(/^#/, '').trim();
    const isUuid = uuidRegex.test(token);
    const isShortCode = /^[0-9a-f]{8}$/i.test(token);

    if (!isUuid && !isShortCode) {
      return {
        success: false,
        error: locale === 'pl' 
          ? 'Wprowadź poprawny numer referencyjny (np. #1A1050FE lub pełny identyfikator).' 
          : 'Please enter a valid reference number (e.g. #1A1050FE or full UUID).'
      };
    }

    const adminClient = createAdminClient();

    // 1. Search in orders table (id or token)
    let orderQuery = adminClient
      .from('orders')
      .select('id, token');

    if (isUuid) {
      orderQuery = orderQuery.or(`id.eq.${token},token.eq.${token}`);
    } else {
      const cleanToken = token.toLowerCase();
      const startUuid = `${cleanToken}-0000-0000-0000-000000000000`;
      const endUuid = `${cleanToken}-ffff-ffff-ffff-ffffffffffff`;
      orderQuery = orderQuery.or(`and(id.gte.${startUuid},id.lte.${endUuid}),and(token.gte.${startUuid},token.lte.${endUuid})`);
    }

    const { data: order, error: orderErr } = await orderQuery.maybeSingle();

    if (!orderErr && order) {
      return {
        success: true,
        type: 'order',
        id: order.id,
        token: order.token
      };
    }

    // 2. Search in reservations table (id or token)
    let resQuery = adminClient
      .from('reservations')
      .select('id, token');

    if (isUuid) {
      resQuery = resQuery.or(`id.eq.${token},token.eq.${token}`);
    } else {
      const cleanToken = token.toLowerCase();
      const startUuid = `${cleanToken}-0000-0000-0000-000000000000`;
      const endUuid = `${cleanToken}-ffff-ffff-ffff-ffffffffffff`;
      resQuery = resQuery.or(`and(id.gte.${startUuid},id.lte.${endUuid}),and(token.gte.${startUuid},token.lte.${endUuid})`);
    }

    const { data: reservation, error: resErr } = await resQuery.maybeSingle();

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
