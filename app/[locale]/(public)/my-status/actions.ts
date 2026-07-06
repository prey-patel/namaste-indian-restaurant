'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';
import { headers } from 'next/headers';
import crypto from 'crypto';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function verifyContactInfo(
  input: string,
  recordEmail: string | null,
  recordPhone: string | null
): boolean {
  const cleanInput = input.trim().toLowerCase();
  
  if (recordEmail && cleanInput === recordEmail.trim().toLowerCase()) {
    return true;
  }

  const inputDigits = cleanInput.replace(/\D/g, '');
  if (inputDigits.length >= 6 && recordPhone) {
    const recordDigits = recordPhone.replace(/\D/g, '');
    if (recordDigits.endsWith(inputDigits)) {
      return true;
    }
  }

  return false;
}

export async function lookupStatusAction(
  rawToken: string,
  locale: 'pl' | 'en',
  emailOrPhone?: string
) {
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

    // 1. Secure Rate Limiting by Hashed IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const secret = process.env.ORDER_IP_HASH_SECRET;
    if (!secret) {
      console.error('ERROR: ORDER_IP_HASH_SECRET is missing in environment!');
      return {
        success: false,
        error: locale === 'pl'
          ? 'Wystąpił błąd konfiguracji serwera.'
          : 'Server configuration error.'
      };
    }
    const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex');

    try {
      const rateCheck = await isRateLimited(ipHash, 'order_status_lookup', 10, 60);
      if (rateCheck.limited) {
        return {
          success: false,
          error: locale === 'pl'
            ? 'Zbyt wiele prób wyszukiwania. Spróbuj ponownie później.'
            : 'Too many lookup attempts. Please try again later.'
        };
      }
    } catch (rateErr) {
      console.error('[my-status] Rate limit error:', rateErr);
    }

    const adminClient = createAdminClient();

    // 2. Search in orders table (id or token)
    let orderQuery = adminClient
      .from('orders')
      .select('id, token, customer_email, customer_phone');

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
      if (!isUuid) {
        if (!emailOrPhone) {
          return {
            success: false,
            requiresVerification: true,
            type: 'order'
          };
        }
        const verified = verifyContactInfo(emailOrPhone, order.customer_email, order.customer_phone);
        if (!verified) {
          return {
            success: false,
            error: locale === 'pl'
              ? 'Wprowadzony e-mail lub numer telefonu jest niepoprawny dla tego zamówienia.'
              : 'The entered email or phone number is incorrect for this order.'
          };
        }
      }

      return {
        success: true,
        type: 'order',
        id: order.id,
        token: order.token
      };
    }

    // 3. Search in reservations table (id or token)
    let resQuery = adminClient
      .from('reservations')
      .select('id, token, email, phone');

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
      if (!isUuid) {
        if (!emailOrPhone) {
          return {
            success: false,
            requiresVerification: true,
            type: 'reservation'
          };
        }
        const verified = verifyContactInfo(emailOrPhone, reservation.email, reservation.phone);
        if (!verified) {
          return {
            success: false,
            error: locale === 'pl'
              ? 'Wprowadzony e-mail lub numer telefonu jest niepoprawny dla tej rezerwacji.'
              : 'The entered email or phone number is incorrect for this reservation.'
          };
        }
      }

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
