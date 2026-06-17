import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocodeAddressGoogle, calculateRouteGoogle } from "./google-maps";

export interface RestaurantCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Resolves the restaurant address and geocodes it if coordinates are missing.
 * Saves/updates coordinates in system_settings if geocoded successfully.
 * Falls back to environment variables RESTAURANT_LATITUDE and RESTAURANT_LONGITUDE if geocoding fails.
 */
export async function geocodeRestaurantAddress(): Promise<RestaurantCoordinates | null> {
  const adminClient = createAdminClient();

  // 1. Fetch settings keys
  const { data: settingsData, error } = await adminClient
    .from("system_settings")
    .select("key, value");

  if (error || !settingsData) {
    console.error("[Restaurant Coordinates] Failed to fetch system_settings:", error);
    // Try environment variables fallback
    const envLat = process.env.RESTAURANT_LATITUDE;
    const envLng = process.env.RESTAURANT_LONGITUDE;
    if (envLat && envLng) {
      return { latitude: Number(envLat), longitude: Number(envLng) };
    }
    return null;
  }

  const settings: Record<string, any> = {};
  settingsData.forEach((item) => {
    settings[item.key] = item.value;
  });

  const coordinates = settings.coordinates || { status: "unverified", latitude: null, longitude: null };

  // Use cached coordinates if verified
  if (
    coordinates.status === "verified" &&
    coordinates.latitude !== null &&
    coordinates.longitude !== null
  ) {
    return {
      latitude: Number(coordinates.latitude),
      longitude: Number(coordinates.longitude),
    };
  }

  // Fetch address settings
  const street = settings.restaurant_address;
  const postalCode = settings.restaurant_postal_code;
  const city = settings.restaurant_city;
  const country = settings.restaurant_country || "Poland";

  if (!street) {
    console.warn("[Restaurant Coordinates] Restaurant address not configured in settings.");
    const envLat = process.env.RESTAURANT_LATITUDE;
    const envLng = process.env.RESTAURANT_LONGITUDE;
    if (envLat && envLng) {
      return { latitude: Number(envLat), longitude: Number(envLng) };
    }
    return null;
  }

  const fullAddress = `${street}, ${postalCode || ""} ${city || ""}, ${country}`;

  try {
    const geo = await geocodeAddressGoogle(fullAddress);

    // Save verified coordinates in DB
    const newCoords = {
      status: "verified",
      latitude: geo.latitude,
      longitude: geo.longitude,
      verified_at: new Date().toISOString(),
    };

    await adminClient
      .from("system_settings")
      .upsert({
        key: "coordinates",
        value: newCoords,
        updated_at: new Date().toISOString(),
      });

    return {
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  } catch (err: any) {
    console.error("[Restaurant Coordinates] Geocoding restaurant address failed:", err.message);

    // Try env vars fallback
    const envLat = process.env.RESTAURANT_LATITUDE;
    const envLng = process.env.RESTAURANT_LONGITUDE;
    if (envLat && envLng) {
      console.log("[Restaurant Coordinates] Using environment fallback coordinates.");
      return { latitude: Number(envLat), longitude: Number(envLng) };
    }

    // Update coordinates value in DB as failed
    await adminClient
      .from("system_settings")
      .upsert({
        key: "coordinates",
        value: {
          status: "failed",
          latitude: null,
          longitude: null,
          error: err.message,
        },
        updated_at: new Date().toISOString(),
      });

    return null;
  }
}

/**
 * Calculates suggested delivery fee based on active distance rules or postal codes.
 * Returns suggested amount in Polish grosz.
 */
export async function calculateSuggestedDeliveryFee(
  distanceMeters: number,
  postalCode?: string | null
): Promise<number | null> {
  const adminClient = createAdminClient();
  const distanceKm = distanceMeters / 1000;

  // 1. Try distance-based rules
  const { data: rules, error: rulesError } = await adminClient
    .from("delivery_fee_rules")
    .select("*")
    .eq("is_active", true)
    .order("min_distance_km", { ascending: true });

  if (!rulesError && rules && rules.length > 0) {
    const matchingRule = rules.find((rule) => {
      const min = Number(rule.min_distance_km);
      const max = rule.max_distance_km !== null ? Number(rule.max_distance_km) : null;
      return distanceKm >= min && (max === null || distanceKm < max);
    });

    if (matchingRule) {
      return Math.round(Number(matchingRule.fee_amount) * 100);
    }
  }

  // 2. Try postal code override as fallback
  if (postalCode) {
    const { data: pcData, error: pcError } = await adminClient
      .from("delivery_postal_codes")
      .select("*, delivery_zones(*)")
      .eq("postal_code", postalCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!pcError && pcData) {
      const fee = pcData.delivery_fee_override !== null
        ? Number(pcData.delivery_fee_override)
        : (pcData.delivery_zones ? Number(pcData.delivery_zones.delivery_fee) : 0);
      return Math.round(fee * 100);
    }
  }

  return null;
}

/**
 * Geocodes customer delivery address, calculates car/walk distance/time,
 * and updates order with delivery intelligence data.
 */
export async function calculateDeliveryDistance(orderId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  // 1. Fetch order
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error(`[Delivery Distance] Order ${orderId} not found.`);
    return false;
  }

  if (order.order_type !== "delivery") {
    return false;
  }

  // 2. Get restaurant origin coordinates
  const origin = await geocodeRestaurantAddress();
  if (!origin) {
    console.error("[Delivery Distance] Restaurant coordinates unavailable.");
    await adminClient
      .from("orders")
      .update({
        delivery_geocoding_status: "failed",
        delivery_distance_error: "Restaurant location not verified — distance unavailable",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    return false;
  }

  // 3. Resolve customer address
  const street = order.delivery_address;
  const postalCode = order.delivery_postal_code;
  const city = order.delivery_city || "Ciechanów";
  const country = "Poland";

  if (!street) {
    console.error(`[Delivery Distance] Order ${orderId} is missing street address.`);
    await adminClient
      .from("orders")
      .update({
        delivery_geocoding_status: "failed",
        delivery_distance_error: "Customer street address is empty",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    return false;
  }

  const customerAddress = `${street}, ${postalCode || ""} ${city}, ${country}`;

  try {
    // 4. Geocode customer address
    const geo = await geocodeAddressGoogle(customerAddress);

    // 5. Calculate routes
    let carRoute = null;
    let walkRoute = null;
    let routingError: string | null = null;

    try {
      carRoute = await calculateRouteGoogle(origin, geo, "driving");
    } catch (err: any) {
      console.error(`[Delivery Distance] Driving route failed:`, err.message);
      routingError = `Car routing failed: ${err.message}`;
    }

    try {
      walkRoute = await calculateRouteGoogle(origin, geo, "walking");
    } catch (err: any) {
      console.error(`[Delivery Distance] Walking route failed:`, err.message);
      if (routingError) {
        routingError += ` | Walk routing failed: ${err.message}`;
      } else {
        routingError = `Walk routing failed: ${err.message}`;
      }
    }

    // 6. Calculate suggested fee
    const suggestedFeeAmount = carRoute
      ? await calculateSuggestedDeliveryFee(carRoute.distanceMeters, postalCode)
      : null;

    // 7. Save results in orders table
    const updates: Record<string, any> = {
      delivery_latitude: geo.latitude,
      delivery_longitude: geo.longitude,
      delivery_geocoded_address: geo.formattedAddress,
      delivery_geocoding_status: routingError
        ? carRoute || walkRoute
          ? "partial"
          : "failed"
        : "success",
      delivery_distance_car_meters: carRoute ? carRoute.distanceMeters : null,
      delivery_duration_car_seconds: carRoute ? carRoute.durationSeconds : null,
      delivery_distance_walk_meters: walkRoute ? walkRoute.distanceMeters : null,
      delivery_duration_walk_seconds: walkRoute ? walkRoute.durationSeconds : null,
      suggested_delivery_fee_amount: suggestedFeeAmount,
      delivery_distance_calculated_at: new Date().toISOString(),
      delivery_distance_error: routingError,

      // Backward compatibility fields
      route_distance_km: carRoute ? Number((carRoute.distanceMeters / 1000).toFixed(2)) : null,
      route_duration_car_minutes: carRoute ? Math.ceil(carRoute.durationSeconds / 60) : null,
      route_duration_walk_minutes: walkRoute ? Math.ceil(walkRoute.durationSeconds / 60) : null,
      route_provider: "google_routes_v2",
      geocoding_status: "success", // Legacy column
      geocoding_error: routingError, // Legacy column
      address_verified_at: new Date().toISOString(), // Legacy column
    };

    await adminClient
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    return true;
  } catch (err: any) {
    console.error(`[Delivery Distance] Calculation failed for order ${orderId}:`, err.message);

    // Safe fallback updates without crashing order
    await adminClient
      .from("orders")
      .update({
        delivery_geocoding_status: "failed",
        delivery_distance_error: err.message,
        geocoding_status: "failed", // Legacy column
        geocoding_error: err.message, // Legacy column
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return false;
  }
}

/**
 * Recalculate order delivery distance metrics (used on recalculate trigger).
 */
export async function refreshOrderDeliveryDistance(orderId: string): Promise<boolean> {
  return calculateDeliveryDistance(orderId);
}
