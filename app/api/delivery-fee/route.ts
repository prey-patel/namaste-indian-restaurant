import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeAddressGoogle, calculateRouteGoogle } from '@/lib/delivery/google-maps';
import { geocodeRestaurantAddress } from '@/lib/delivery/distance';

import crypto from 'crypto';
import { isRateLimited } from '@/lib/security/rate-limit';

export interface DeliveryFeeResult {
  success: true;
  fee: number;           // PLN
  distanceKm: number;
  durationMinutes: number;
  walkDistanceKm: number | null;
  walkDurationMinutes: number | null;
  zoneName: string;
  action: 'allow' | 'contact' | 'block';
  geocodedAddress: string;
}

export interface DeliveryFeeError {
  success: false;
  error: string;
  code: 'RATE_LIMITED' | 'INVALID_INPUT' | 'GEOCODING_FAILED' | 'ROUTING_FAILED' | 'NO_ZONE' | 'SERVER_ERROR';
}

export type DeliveryFeeResponse = DeliveryFeeResult | DeliveryFeeError;

/** Normalise rule_action from DB enum to client-facing string */
function normaliseAction(raw: string): 'allow' | 'contact' | 'block' {
  const v = raw.toLowerCase();
  if (v === 'allow') return 'allow';
  if (v === 'block') return 'block';
  return 'contact'; // 'contact_restaurant' and any other contact variant
}

export async function POST(req: NextRequest): Promise<NextResponse<DeliveryFeeResponse>> {
  // 1. Persistent DB Rate limiting by hashed IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const secret = process.env.ORDER_IP_HASH_SECRET || 'NamasteOrderPepper51198';
  const ipHash = crypto.createHmac('sha256', secret).update(ip).digest('hex');

  try {
    const rateCheck = await isRateLimited(ipHash, 'order_status_lookup', 30, 60); // max 30 lookups per minute
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }
  } catch (rateErr) {
    console.error('[/api/delivery-fee] Rate check error:', rateErr);
    // Continue gracefully if DB rate limiting is temporarily unavailable
  }

  // 2. Parse + validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const { street, postalCode, city } = (body as Record<string, unknown>);

  if (
    typeof street !== 'string' || street.trim().length < 3 ||
    typeof city !== 'string' || city.trim().length < 2
  ) {
    return NextResponse.json(
      { success: false, error: 'Street address and city are required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const cleanStreet = street.trim().substring(0, 200);
  const cleanPostal = typeof postalCode === 'string' ? postalCode.trim().substring(0, 10) : '';
  const cleanCity = city.trim().substring(0, 100);

  // 3. Build full customer address string
  const customerAddress = cleanPostal
    ? `${cleanStreet}, ${cleanPostal} ${cleanCity}, Poland`
    : `${cleanStreet}, ${cleanCity}, Poland`;

  try {
    // 4. Get restaurant origin coordinates (cached in system_settings)
    const origin = await geocodeRestaurantAddress();
    if (!origin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restaurant location is not configured. Please contact the restaurant.',
          code: 'SERVER_ERROR',
        },
        { status: 503 }
      );
    }

    // 5. Geocode customer address
    let customerGeo;
    try {
      customerGeo = await geocodeAddressGoogle(customerAddress);
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not find the entered address. Please check the street, postal code and city.',
          code: 'GEOCODING_FAILED',
        },
        { status: 422 }
      );
    }

    // 6. Calculate driving and walking routes
    let route;
    try {
      route = await calculateRouteGoogle(origin, customerGeo, 'driving');
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not calculate route to your address.',
          code: 'ROUTING_FAILED',
        },
        { status: 422 }
      );
    }

    const distanceKm = route.distanceMeters / 1000;
    const durationMinutes = Math.ceil(route.durationSeconds / 60);

    let walkRoute = null;
    try {
      walkRoute = await calculateRouteGoogle(origin, customerGeo, 'walking');
    } catch (err: any) {
      console.warn('[/api/delivery-fee] Walking route calculation failed:', err.message);
    }

    // 7. Look up matching delivery zone from admin-configured rules
    const adminClient = createAdminClient();
    const { data: rules, error: rulesError } = await adminClient
      .from('delivery_fee_rules')
      .select('name, min_distance_km, max_distance_km, fee_amount, rule_action')
      .eq('is_active', true)
      .order('min_distance_km', { ascending: true });

    if (rulesError || !rules || rules.length === 0) {
      // No zones configured — fall back to a sensible "contact" response
      return NextResponse.json({
        success: true,
        fee: 0,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        durationMinutes,
        walkDistanceKm: walkRoute ? parseFloat((walkRoute.distanceMeters / 1000).toFixed(2)) : null,
        walkDurationMinutes: walkRoute ? Math.ceil(walkRoute.durationSeconds / 60) : null,
        zoneName: 'Default',
        action: 'contact',
        geocodedAddress: customerGeo.formattedAddress,
      });
    }

    // Find the matching zone (half-open interval: min <= distance < max)
    const matchingRule = rules.find((rule) => {
      const min = Number(rule.min_distance_km);
      const max = rule.max_distance_km !== null ? Number(rule.max_distance_km) : null;
      return distanceKm >= min && (max === null || distanceKm < max);
    });

    if (!matchingRule) {
      // Distance is beyond all configured zones
      return NextResponse.json(
        {
          success: false,
          error: 'Your address is outside our delivery area.',
          code: 'NO_ZONE',
        },
        { status: 422 }
      );
    }

    const action = normaliseAction((matchingRule.rule_action as string) || 'allow');
    // Only charge a fee for 'allow' action
    const fee = action === 'block' ? 0 : Number(matchingRule.fee_amount);

    return NextResponse.json({
      success: true,
      fee,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes,
      walkDistanceKm: walkRoute ? parseFloat((walkRoute.distanceMeters / 1000).toFixed(2)) : null,
      walkDurationMinutes: walkRoute ? Math.ceil(walkRoute.durationSeconds / 60) : null,
      zoneName: matchingRule.name,
      action,
      geocodedAddress: customerGeo.formattedAddress,
    });

  } catch (err: any) {
    console.error('[/api/delivery-fee] Unexpected error:', err?.message ?? err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
