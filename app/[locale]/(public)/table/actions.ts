'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { orderRequestSchema } from '@/lib/validation/orders';
import { calculateOrderTotalServerSide } from '@/lib/orders/pricing';
import { isRateLimited } from '@/lib/security/rate-limit';
import { sendOrderNewAdminEmail } from '@/lib/email/send-order-emails';

export async function createDineInOrderAction(rawData: any) {
  try {
    // 1. Validate fields with Zod
    const result = orderRequestSchema.safeParse(rawData);
    if (!result.success) {
      const errorMsg = result.error.errors[0]?.message || 'Invalid form data.';
      return { success: false, error: errorMsg };
    }
    const data = result.data;

    if (data.order_type !== 'dine_in') {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Nieprawidłowy typ zamówienia dla obsługi stolika.'
          : 'Invalid order type for dine-in.'
      };
    }

    if (data.payment_method !== 'cash_at_table' && data.payment_method !== 'card_at_table') {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Nieprawidłowa metoda płatności dla stolika. Dozwolone: gotówka lub karta.'
          : 'Invalid payment method for table ordering. Only cash or card allowed.'
      };
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
      const rateCheck = await isRateLimited(ipHash, 'order', 15, 3600); // 15 requests per hour (more lenient than delivery/takeaway)
      if (rateCheck.limited) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? `Zbyt wiele prób złożenia zamówienia. Spróbuj ponownie za ${Math.ceil(rateCheck.retryAfterSeconds / 60)} min.`
            : `Too many order requests. Please try again in ${Math.ceil(rateCheck.retryAfterSeconds / 60)} min.`
        };
      }
    } catch (err) {
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
      .select('dine_in_ordering_enabled')
      .single();

    if (opStatus && !opStatus.dine_in_ordering_enabled) {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Zamówienia przy stoliku są obecnie wyłączone.'
          : 'Table ordering is currently disabled.'
      };
    }

    // 4. Resolve table QR token
    const { data: table, error: tableError } = await adminClient
      .from('dining_tables')
      .select('id, table_number, is_active')
      .eq('qr_token', data.table_qr_token)
      .maybeSingle();

    if (tableError || !table) {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Nieprawidłowy kod QR stolika.'
          : 'Invalid table QR code.'
      };
    }

    if (!table.is_active) {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Ten stolik jest obecnie nieaktywny.'
          : 'This table is currently inactive.'
      };
    }

    // 5. Timezone & Opening status checks
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
          ? `Dziś nie przyjmujemy zamówień z powodu: ${holidayName}`
          : `Ordering is closed today due to: ${holidayName}`
      };
    }

    // Daily service hours check
    const dayOfWeek = nowInWarsaw.getDay();
    const { data: serviceHour } = await adminClient
      .from('service_hours')
      .select('open_time, close_time, is_closed')
      .eq('service_type', 'dine_in')
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (serviceHour) {
      if (serviceHour.is_closed) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Restauracja jest dziś zamknięta dla zamówień przy stoliku.'
            : 'The restaurant is closed for dine-in ordering today.'
        };
      }

      const currentHour = String(nowInWarsaw.getHours()).padStart(2, '0');
      const currentMinute = String(nowInWarsaw.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}:00`;

      if (currentTimeStr < serviceHour.open_time || currentTimeStr > serviceHour.close_time) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? `Zamówienia przy stoliku przyjmujemy w godzinach: ${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
            : `Table ordering is available between: ${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
        };
      }
    }

    // 6. Manage Active Table Session
    let tableSessionId = data.table_session_id;

    if (tableSessionId) {
      // Validate that session exists and is active for this table
      const { data: existingSession } = await adminClient
        .from('table_sessions')
        .select('id')
        .eq('id', tableSessionId)
        .eq('table_id', table.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!existingSession) {
        tableSessionId = null;
      }
    }

    if (!tableSessionId) {
      // Find current active session for this table
      const { data: currentSession } = await adminClient
        .from('table_sessions')
        .select('id')
        .eq('table_id', table.id)
        .eq('status', 'active')
        .maybeSingle();

      if (currentSession) {
        tableSessionId = currentSession.id;
      } else {
        // Create new active table session
        const { data: newSession, error: newSessionError } = await adminClient
          .from('table_sessions')
          .insert({
            table_id: table.id,
            customer_name: data.customer_name,
            status: 'active'
          })
          .select('id')
          .single();

        if (newSessionError || !newSession) {
          console.error('Failed to create table session:', newSessionError);
          return {
            success: false,
            error: data.source_language === 'pl'
              ? 'Błąd podczas tworzenia sesji stolika.'
              : 'Failed to initialize table session.'
          };
        }
        tableSessionId = newSession.id;
      }
    }

    // 7. Server-side Pricing Recalculation
    const pricingResult = await calculateOrderTotalServerSide(
      data.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
      'dine_in',
      null
    );

    const sanitizedCustomerNotes = data.customer_notes
      ? data.customer_notes.replace(/<[^>]*>/g, '')
      : null;

    const userAgent = headersList.get('user-agent') || 'unknown';
    const nowStr = new Date().toISOString();

    // 8. Insert order (Auto-Approved for Dine-In)
    const orderInsertPayload: Record<string, any> = {
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      order_type: 'dine_in',
      status: 'approved', // Auto-approved
      payment_status: 'pending',
      payment_method: data.payment_method,
      customer_notes: sanitizedCustomerNotes,
      items_subtotal: pricingResult.itemsSubtotal,
      packaging_total: 0.00,
      delivery_fee: 0.00,
      total_amount: pricingResult.itemsSubtotal,
      table_id: table.id,
      table_session_id: tableSessionId,
      customer_language: data.source_language,
      approved_at: nowStr,
      admin_notes: `Table ordering from Table ${table.table_number}. Browser: ${userAgent.substring(0, 100)}`
    };

    const { data: newOrder, error: orderError } = await adminClient
      .from('orders')
      .insert(orderInsertPayload)
      .select('id, token')
      .single();

    if (orderError || !newOrder) {
      console.error('Database dine-in order insert error:', orderError);
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Błąd podczas zapisywania zamówienia. Spróbuj ponownie.'
          : 'Failed to save order. Please try again.'
      };
    }

    // 9. Insert order items
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

    // 10. Notifications
    try {
      // Trigger new order email notification to admin
      await sendOrderNewAdminEmail(newOrder.id);
    } catch (emailErr) {
      console.error('Failed to send admin notification email:', emailErr);
    }

    try {
      // Dispatch push notifications to KDS (directly to approved-kds state)
      const { dispatchOrderPush } = await import('@/lib/push/dispatch-order-push');
      await dispatchOrderPush(newOrder.id, 'approved-kds');
    } catch (pushErr) {
      console.error('Failed to dispatch order push alert:', pushErr);
    }

    return {
      success: true,
      id: newOrder.id,
      token: newOrder.token,
      itemsSubtotal: pricingResult.itemsSubtotal,
      totalAmount: pricingResult.itemsSubtotal,
      orderType: 'dine_in',
      tableNumber: table.table_number,
      tableSessionId
    };

  } catch (err: any) {
    console.error('Server error in createDineInOrderAction:', err);
    return {
      success: false,
      error: err.message || 'An unexpected server error occurred.'
    };
  }
}
