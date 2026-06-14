'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { reservationRequestSchema } from '@/lib/validation/reservations';
import { z } from 'zod';

import { isRateLimited } from '@/lib/security/rate-limit';
import {
  sendReservationRequestReceivedCustomerEmail,
  sendReservationNewAdminEmail
} from '@/lib/email/send-reservation-emails';


function addTwoHours(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const nh = (h + 2) % 24;
  return `${nh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function createReservationRequestAction(rawData: z.infer<typeof reservationRequestSchema>) {
  try {
    // 1. Validate fields with Zod
    const data = reservationRequestSchema.parse(rawData);

    // 2. Rate limiting check (using hashed client IP)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const secret = process.env.RESERVATION_IP_HASH_SECRET;
    if (!secret) {
      console.error('ERROR: RESERVATION_IP_HASH_SECRET is missing in environment!');
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Wystąpił błąd serwera. Spróbuj ponownie później.'
          : 'Server configuration error. Please try again later.'
      };
    }
    const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex');

    try {
      const rateCheck = await isRateLimited(ipHash, 'reservation', 3, 3600); // 3 requests per hour (3600s)
      if (rateCheck.limited) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? `Zbyt wiele prób rezerwacji. Spróbuj ponownie za ${Math.ceil(rateCheck.retryAfterSeconds / 60)} min.`
            : `Too many reservation requests. Please try again in ${Math.ceil(rateCheck.retryAfterSeconds / 60)} min.`
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

    // 3. Past Date / Time Validation
    // Parse target date/time in Europe/Warsaw
    const targetDateTime = new Date(`${data.reservation_date}T${data.reservation_time}:00+01:00`); // CEST/CET baseline
    const now = new Date();
    if (targetDateTime < now) {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Data rezerwacji nie może być w przeszłości.'
          : 'Reservation date cannot be in the past.'
      };
    }

    const adminClient = createAdminClient();

    // 3.5. Dynamic Guest Limit Verification
    const { data: maxGuestsSetting } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'reservation_max_guests')
      .maybeSingle();
    const maxGuests = maxGuestsSetting ? Number(maxGuestsSetting.value) : 8;
    if (data.guests_count > maxGuests) {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? `Maksymalna liczba gości dla rezerwacji online to ${maxGuests}.`
          : `Maximum allowed guests per online booking is ${maxGuests}.`
      };
    }

    // 4. Operational Settings Verification
    const { data: opStatus } = await adminClient
      .from('operational_status')
      .select('reservations_enabled')
      .single();

    if (opStatus && !opStatus.reservations_enabled) {
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Rezerwacje stolików online są obecnie wyłączone.'
          : 'Online table reservations are currently disabled.'
      };
    }

    // 5. Holiday Closures Verification
    const { data: holiday } = await adminClient
      .from('holiday_closures')
      .select('id, title_pl, title_en')
      .eq('date', data.reservation_date)
      .eq('is_closed', true)
      .maybeSingle();

    if (holiday) {
      const holidayName = data.source_language === 'pl' ? holiday.title_pl : holiday.title_en;
      return {
        success: false,
        error: data.source_language === 'pl'
          ? `Restauracja jest zamknięta w tym dniu z powodu: ${holidayName}`
          : `The restaurant is closed on this date due to: ${holidayName}`
      };
    }

    // 6. Service Hours Verification
    // Date.getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayOfWeek = new Date(data.reservation_date).getDay();
    const { data: serviceHour } = await adminClient
      .from('service_hours')
      .select('open_time, close_time, is_closed')
      .eq('service_type', 'reservations')
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (serviceHour) {
      if (serviceHour.is_closed) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? 'Restauracja jest zamknięta dla rezerwacji w ten dzień tygodnia.'
            : 'Reservations are closed on this day of the week.'
        };
      }

      const resTime = data.reservation_time + ':00';
      if (resTime < serviceHour.open_time || resTime > serviceHour.close_time) {
        return {
          success: false,
          error: data.source_language === 'pl'
            ? `Godziny rezerwacji to: ${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
            : `Reservation hours are: ${serviceHour.open_time.substring(0, 5)} - ${serviceHour.close_time.substring(0, 5)}`
        };
      }
    }

    // 7. Sanitize Customer Notes / Special Requests
    const sanitizedNotes = data.customer_notes
      ? data.customer_notes.replace(/<[^>]*>/g, '') // strip HTML
      : null;

    const sanitizedOccasion = data.occasion
      ? data.occasion.replace(/<[^>]*>/g, '') // strip HTML
      : null;

    const combinedNotes = sanitizedOccasion
      ? (sanitizedNotes ? `${sanitizedNotes} (Occasion: ${sanitizedOccasion})` : `Occasion: ${sanitizedOccasion}`)
      : sanitizedNotes;

    // 8. Insert Reservation as pending using service role client (bypasses RLS for public submit)
    const startAt = `${data.reservation_date} ${data.reservation_time}:00 Europe/Warsaw`;
    const endAt = `${data.reservation_date} ${addTwoHours(data.reservation_time)} Europe/Warsaw`;

    const userAgent = headersList.get('user-agent') || 'unknown';

    const { data: newReservation, error: insertError } = await adminClient
      .from('reservations')
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        reservation_start_at: startAt,
        reservation_end_at: endAt,
        guests_count: data.guests_count,
        status: 'pending', // Strictly pending
        source: 'website',
        customer_notes: combinedNotes,
        consent_accepted_at: new Date().toISOString(),
        privacy_policy_version: data.privacy_policy_version,
        // Save metadata like source language & user-agent (no raw IP)
        admin_notes: `Language: ${data.source_language}. Browser: ${userAgent.substring(0, 100)}`
      })
      .select('id, token')
      .single();

    if (insertError || !newReservation) {
      console.error('Database insert error in createReservationRequestAction:', insertError);
      return {
        success: false,
        error: data.source_language === 'pl'
          ? 'Wystąpił błąd podczas zapisywania rezerwacji. Spróbuj ponownie.'
          : 'Failed to submit reservation. Please try again.'
      };
    }

    // Trigger transactional email notifications
    await sendReservationRequestReceivedCustomerEmail(newReservation.id);
    await sendReservationNewAdminEmail(newReservation.id);

    return {
      success: true,
      id: newReservation.id,
      token: newReservation.token
    };

  } catch (err: any) {
    console.error('Server error in createReservationRequestAction:', err);
    return {
      success: false,
      error: err.message || 'An unexpected server error occurred.'
    };
  }
}
