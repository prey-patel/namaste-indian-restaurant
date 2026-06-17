import "server-only";

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Resolves Google Maps API Key from environment variables.
 */
function getApiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.ROUTING_PROVIDER_API_KEY || "AIzaSyB1wIYCSXcvVOEtVRDiN5s5yBzw9JIkI74";
}

/**
 * Geocodes a text address to coordinates using the Google Geocoding API.
 */
export async function geocodeAddressGoogle(address: string): Promise<GeocodingResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Google Maps API Key is not configured.");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  console.log(`[Google Maps Geocoding] Fetching coordinates for: ${address.substring(0, 50)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    throw new Error(`Geocoding API error! Status: ${data.status}. Address might be invalid.`);
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  const formattedAddress = result.formatted_address;

  return {
    latitude: lat,
    longitude: lng,
    formattedAddress,
  };
}

/**
 * Calculates routing distance and duration using the new Google Routes API.
 */
export async function calculateRouteGoogle(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  mode: "driving" | "walking"
): Promise<RouteResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Google Maps API Key is not configured.");
  }

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const travelMode = mode === "walking" ? "WALK" : "DRIVE";
  const body: Record<string, any> = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      },
    },
    travelMode,
    computeAlternativeRoutes: false,
    languageCode: "en-US",
    units: "METRIC",
  };

  // Only driving supports traffic-aware routing preferences
  if (mode === "driving") {
    body.routingPreference = "TRAFFIC_AWARE";
  }

  console.log(`[Google Routes API] Fetching route (${mode}) between points...`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Google Routes API] Error response: ${errorText}`);
    throw new Error(`Routes API HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error("No routes found between origin and destination.");
  }

  const route = data.routes[0];
  const distanceMeters = route.distanceMeters;
  const durationStr = route.duration; // e.g. "165s"

  if (distanceMeters === undefined || !durationStr) {
    throw new Error("Routes API response is missing distance or duration.");
  }

  // Parse duration string like "165s" to integer seconds
  const durationSeconds = parseInt(durationStr.replace("s", ""), 10);

  return {
    distanceMeters,
    durationSeconds,
  };
}
