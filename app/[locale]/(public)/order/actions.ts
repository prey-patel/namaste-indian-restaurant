'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { orderRequestSchema } from '@/lib/validation/orders';
import { calculateOrderTotalServerSide } from '@/lib/orders/pricing';
import { z } from 'zod';
import { calculateDeliveryDistance } from '@/lib/delivery/distance';

import { isRateLimited } from '@/lib/security/rate-limit';
import {
  sendOrderRequestReceivedCustomerEmail,
  sendOrderNewAdminEmail
} from '@/lib/email/send-order-emails';


export async function createOrderRequestAction(rawData: any) {
  try {
    // 1. Validate fields with Zod
    const result = orderRequestSchema.safeParse(rawData);
    if (!result.success) {
      const errorMsg = result.error.errors[0]?.message || 'Invalid form data.';
      return {
        success: false,
        error: errorMsg
      };
    }
    const data = result.data;

    // Reject mismatched order_type and payment_method server-side
    if (data.order_type === 'takeaway') {
      if (data.payment_method !== 'cash_on_pickup' && data.payment_method !== 'card_on_pickup') {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Nieprawidłowa metoda płatności dla odbioru osobistego. Dozwolone: gotówka lub karta przy odbiorze.'
            : 'Invalid payment method for takeaway. Only cash or card on pickup allowed.'
        };
      }
    } else if (data.order_type === 'delivery') {
      if (data.payment_method !== 'cash_on_delivery' && data.payment_method !== 'card_on_delivery') {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Nieprawidłowa metoda płatności dla dostawy. Dozwolone: gotówka lub karta przy dostawie.'
            : 'Invalid payment method for delivery. Only cash or card on delivery allowed.'
        };
      }
    }

    // 2. Rate limiting check (using hashed client IP)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const secret = process.env.ORDER_IP_HASH_SECRET;
    if (!secret) {
      console.error('ERROR: ORDER_IP_HASH_SECRET is missing in environment!');
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Wystąpił błąd serwera. Spróbuj ponownie później.'
          : 'Server configuration error. Please try again later.'
      };
    }
    const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex');

    try {
      const rateCheck = await isRateLimited(ipHash, 'order', 5, 3600); // 5 requests per hour (3600s)
      if (rateCheck.limited) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? `Zbyt wiele prób złożenia zamówienia. Spróbuj ponownie za ${Math.ceil(rateCheck.retryAfterSeconds / 60)} min.`
            : `Too many order requests. Please try again in ${Math.ceil(rateCheck.retryAfterSeconds / 60)} min.`
        };
      }
    } catch (err) {
      // Fail-closed fallback: return request verification failure error
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Wystąpił błąd weryfikacji żądania. Spróbuj ponownie później.'
          : 'Request verification failed. Please try again later.'
      };
    }

    const adminClient = createAdminClient();

    // 3. Operational Status Verification
    const { data: opStatus } = await adminClient
      .from('operational_status')
      .select('delivery_enabled, takeaway_enabled')
      .single();

    if (opStatus) {
      if (data.order_type === 'delivery' && !opStatus.delivery_enabled) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Dostawa online jest obecnie wyłączona.'
            : 'Online delivery is currently disabled.'
        };
      }
      if (data.order_type === 'takeaway' && !opStatus.takeaway_enabled) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Zamówienia na wynos są obecnie wyłączone.'
            : 'Takeaway orders are currently disabled.'
        };
      }
    }

    // 4. Timezone & Opening status checks
    const nowInWarsaw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    const year = nowInWarsaw.getFullYear();
    const month = String(nowInWarsaw.getMonth() + 1).padStart(2, '0');
    const day = String(nowInWarsaw.getDate()).padStart(2, '0');
    const todayLocalDate = `${year}-${month}-${day}`;

    // Holiday closures check
    const { data: holiday } = await adminClient
      .from('holiday_closures')
      .select('id, title_pl, title_en')
      .eq('date', todayLocalDate)
      .eq('is_closed', true)
      .maybeSingle();

    if (holiday) {
      const holidayName = data.source_language === 'pl' ? holiday.title_pl : holiday.title_en;
      return {
        success: false,
        error: data.source_language === 'pl'
          ? `Zamówienia są dziś wyłączone z powodu: ${holidayName}`
          : `Ordering is closed today due to: ${holidayName}`
      };
    }

    // Daily service hours check
    const dayOfWeek = nowInWarsaw.getDay(); // 0 = Sunday, 1 = Monday ...
    const { data: serviceHour } = await adminClient
      .from('service_hours')
      .select('open_time, close_time, is_closed')
      .eq('service_type', data.order_type)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (serviceHour) {
      if (serviceHour.is_closed) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Restauracja jest dziś zamknięta dla tego typu zamówień.'
            : 'The restaurant is closed for this order type today.'
        };
      }

      const currentHour = String(nowInWarsaw.getHours()).padStart(2, '0');
      const currentMinute = String(nowInWarsaw.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}:00`;

      if (currentTimeStr < serviceHour.open_time || currentTimeStr > serviceHour.close_time) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? `Godziny przyjmowania zamówień to: ${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
            : `Order hours are: ${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
        };
      }
    }

    // 5. Server-side Pricing Recalculation
    const pricingResult = await calculateOrderTotalServerSide(
      data.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
      data.order_type
    );

    // Sanitize note fields
    const sanitizedCustomerNotes = data.customer_notes
      ? data.customer_notes.replace(/<[^>]*>/g, '')
      : null;

    const userAgent = headersList.get('user-agent') || 'unknown';

    // 6. Insert order as pending (using service role to bypass insert block)
    const orderInsertPayload: Record<string, any> = {
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      order_type: data.order_type,
      status: 'pending', // Strictly pending
      payment_status: 'pending', // Strictly pending
      payment_method: data.payment_method,
      customer_notes: sanitizedCustomerNotes,
      // Save database-calculated totals
      items_subtotal: pricingResult.itemsSubtotal,
      packaging_total: pricingResult.packagingTotal,
      delivery_fee: pricingResult.deliveryFee, // defaults to 0.00
      total_amount: pricingResult.totalAmount,
      route_distance_km: null, // Indicates uncalculated delivery fee
      route_provider: 'unresolved',
      geocoding_status: 'pending',
      customer_language: data.source_language,
      admin_notes: `Browser: ${userAgent.substring(0, 100)}`
    };

    if (data.order_type === 'delivery') {
      orderInsertPayload.delivery_address = data.delivery_address;
      orderInsertPayload.delivery_postal_code = data.delivery_postal_code;
      orderInsertPayload.delivery_city = data.delivery_city;
      orderInsertPayload.delivery_geocoding_status = 'not_attempted';
    }

    const { data: newOrder, error: orderError } = await adminClient
      .from('orders')
      .insert(orderInsertPayload)
      .select('id, token')
      .single();

    if (orderError || !newOrder) {
      console.error('Database order insert error:', orderError);
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Błąd podczas zapisywania zamówienia. Spróbuj ponownie.'
          : 'Failed to save order. Please try again.'
      };
    }

    // 7. Insert order items
    const orderItemsPayload = data.items.map(item => {
      const snap = pricingResult.dbItemsSnapshots[item.menu_item_id];
      const itemNote = item.customer_notes ? item.customer_notes.replace(/<[^>]*>/g, '') : null;
      return {
        order_id: newOrder.id,
        menu_item_id: item.menu_item_id,
        item_name_pl: snap.name_pl,
        item_name_en: snap.name_en,
        unit_price: snap.priceGrosz / 100,
        quantity: item.quantity,
        line_total: (snap.priceGrosz * item.quantity) / 100,
        customer_notes: itemNote,
        allergens_snapshot: snap.allergens,
        spice_level_snapshot: snap.spiciness
      };
    });

    const { error: itemsError } = await adminClient
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error('Database order items insert error:', itemsError);
      // Clean up order to keep DB consistent
      await adminClient.from('orders').delete().eq('id', newOrder.id);
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Błąd podczas zapisywania pozycji zamówienia.'
          : 'Failed to save order items.'
      };
    }

    // 7.5 Calculate delivery distance and route metrics (non-blocking)
    if (data.order_type === 'delivery') {
      try {
        await calculateDeliveryDistance(newOrder.id);
      } catch (distErr) {
        console.error('Failed to calculate delivery distance:', distErr);
      }
    }

    // Trigger transactional email notifications
    await sendOrderRequestReceivedCustomerEmail(newOrder.id);
    await sendOrderNewAdminEmail(newOrder.id);

    return {
      success: true,
      id: newOrder.id,
      token: newOrder.token,
      itemsSubtotal: pricingResult.itemsSubtotal,
      packagingTotal: pricingResult.packagingTotal,
      deliveryFee: pricingResult.deliveryFee,
      totalAmount: pricingResult.totalAmount,
      orderType: data.order_type
    };


  } catch (err: any) {
    console.error('Server error in createOrderRequestAction:', err);
    return {
      success: false,
      error: err.message || 'An unexpected server error occurred.'
    };
  }
}
