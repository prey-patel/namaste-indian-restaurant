import "server-only";

/**
 * ARCHITECTURE PLACEHOLDER - NOT IMPLEMENTED IN PHASE 1
 * This file is an architecture placeholder for geocoding and route calculation (driving/walking distance/ETA).
 * Do not implement business logic in Phase 1.
 * 
 * WARNING: This is a server-only file and must never be imported into client components.
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  confidence?: number;
  formattedAddress: string;
}

export interface RouteDetails {
  distanceKm: number;
  durationCarMinutes: number;
  durationWalkMinutes: number;
  provider: string;
}

/**
 * Geocodes client address to coordinates.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  // Geocoding logic placeholder
  throw new Error("Geocoding placeholder: not implemented in Phase 1");
}

/**
 * Computes routing metrics from restaurant to destination.
 * Falls back to Haversine calculations using coordinates from system_settings if provider fails.
 */
export async function calculateRoute(destination: { lat: number; lon: number }): Promise<RouteDetails> {
  // Routing logic placeholder
  throw new Error("Routing placeholder: not implemented in Phase 1");
}
