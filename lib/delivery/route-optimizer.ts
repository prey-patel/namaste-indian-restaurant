/**
 * Client-safe multi-stop route optimization utility.
 * Uses Haversine distance + brute-force / nearest-neighbor algorithms
 * to find the shortest delivery sequence from the restaurant origin.
 *
 * No "server-only" import — safe to use in 'use client' components.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteOrder {
  id: string;
  lat: number;
  lng: number;
  customerName: string;
  address: string;
}

export interface OptimizedStop {
  order: RouteOrder;
  stopNumber: number;
  distanceFromPrevious: number;  // meters
  cumulativeDistance: number;     // meters
}

export interface OptimizedRoute {
  stops: OptimizedStop[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  googleMapsUrl: string;
}

export interface RouteBatch {
  batchNumber: number;
  route: OptimizedRoute;
}

// ─── Haversine Distance (meters) ─────────────────────────────────────────

function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─── Permutation Generator ───────────────────────────────────────────────

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr.slice()];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// ─── Route Distance Calculator ───────────────────────────────────────────

function totalRouteDistance(origin: Coordinate, stops: RouteOrder[]): number {
  let total = 0;
  let current = origin;
  for (const stop of stops) {
    const coord: Coordinate = { lat: stop.lat, lng: stop.lng };
    total += haversineDistance(current, coord);
    current = coord;
  }
  return total;
}

// ─── Brute-Force Optimizer (2–8 stops) ───────────────────────────────────
// Tests every possible permutation. 8! = 40,320 — instant on any device.

function bruteForceOptimize(origin: Coordinate, orders: RouteOrder[]): RouteOrder[] {
  if (orders.length <= 1) return orders;

  const perms = permutations(orders);
  let best = orders;
  let bestDist = Infinity;

  for (const perm of perms) {
    const dist = totalRouteDistance(origin, perm);
    if (dist < bestDist) {
      bestDist = dist;
      best = perm;
    }
  }

  return best;
}

// ─── Nearest-Neighbor Optimizer (9–10 stops) ─────────────────────────────
// Greedy nearest-first, then 2-opt improvement pass.

function nearestNeighborOptimize(origin: Coordinate, orders: RouteOrder[]): RouteOrder[] {
  const remaining = [...orders];
  const result: RouteOrder[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(current, { lat: remaining[i].lat, lng: remaining[i].lng });
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0];
    result.push(nearest);
    current = { lat: nearest.lat, lng: nearest.lng };
  }

  // 2-opt improvement: try swapping pairs to reduce total distance
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < result.length - 1; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const before = totalRouteDistance(origin, result);
        // Reverse the segment between i and j
        const candidate = [
          ...result.slice(0, i),
          ...result.slice(i, j + 1).reverse(),
          ...result.slice(j + 1),
        ];
        const after = totalRouteDistance(origin, candidate);
        if (after < before) {
          result.splice(0, result.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  return result;
}

// ─── Google Maps Multi-Stop URL Builder ──────────────────────────────────

function buildGoogleMapsUrl(origin: Coordinate, stops: RouteOrder[]): string {
  if (stops.length === 0) return '';

  // Single stop: simple A→B directions
  if (stops.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${stops[0].lat},${stops[0].lng}&travelmode=driving`;
  }

  // Multi-stop: origin → waypoints → final destination
  const lastStop = stops[stops.length - 1];
  const waypoints = stops
    .slice(0, -1)
    .map(s => `${s.lat},${s.lng}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lastStop.lat},${lastStop.lng}&waypoints=${waypoints}&travelmode=driving`;
}

// ─── Route Builder ───────────────────────────────────────────────────────

function buildOptimizedRoute(origin: Coordinate, orderedStops: RouteOrder[]): OptimizedRoute {
  const stops: OptimizedStop[] = [];
  let current = origin;
  let cumulative = 0;

  for (let i = 0; i < orderedStops.length; i++) {
    const stopCoord: Coordinate = { lat: orderedStops[i].lat, lng: orderedStops[i].lng };
    const dist = haversineDistance(current, stopCoord);
    cumulative += dist;

    stops.push({
      order: orderedStops[i],
      stopNumber: i + 1,
      distanceFromPrevious: Math.round(dist),
      cumulativeDistance: Math.round(cumulative),
    });

    current = stopCoord;
  }

  const totalDistanceMeters = Math.round(cumulative);

  // Estimate: ~35 km/h average city speed + 3 min per stop for handoff
  const drivingMinutes = Math.round((totalDistanceMeters / 1000) / 35 * 60);
  const handoffMinutes = orderedStops.length * 3;
  const estimatedMinutes = drivingMinutes + handoffMinutes;

  return {
    stops,
    totalDistanceMeters,
    estimatedMinutes,
    googleMapsUrl: buildGoogleMapsUrl(origin, orderedStops),
  };
}

// ─── Geographic Batch Splitter (10+ orders) ──────────────────────────────
// Clusters orders by angular proximity from origin, max 8 per batch.

function clusterOrders(origin: Coordinate, orders: RouteOrder[], maxSize: number): RouteOrder[][] {
  if (orders.length <= maxSize) return [orders];

  // Sort by polar angle from origin
  const withAngle = orders.map(o => ({
    order: o,
    angle: Math.atan2(o.lat - origin.lat, o.lng - origin.lng),
  }));
  withAngle.sort((a, b) => a.angle - b.angle);

  // Split into chunks of maxSize
  const batches: RouteOrder[][] = [];
  for (let i = 0; i < withAngle.length; i += maxSize) {
    batches.push(withAngle.slice(i, i + maxSize).map(w => w.order));
  }

  return batches;
}

// ─── Main Entry Point ────────────────────────────────────────────────────

/**
 * Optimizes delivery route for a set of orders from a restaurant origin.
 *
 * - 1 order:  returns direct route (no optimization needed)
 * - 2–8 orders: brute-force all permutations → guaranteed shortest path
 * - 9–10 orders: nearest-neighbor + 2-opt improvement
 * - 10+ orders: splits into geographic batches, optimizes each independently
 *
 * @returns Array of RouteBatch objects (usually 1 batch, multiple for 10+ orders)
 */
export function optimizeRoute(
  origin: Coordinate,
  orders: RouteOrder[]
): RouteBatch[] {
  if (orders.length === 0) return [];

  // Filter out orders missing coordinates
  const valid = orders.filter(
    o => o.lat != null && o.lng != null && o.lat !== 0 && o.lng !== 0
  );

  if (valid.length === 0) return [];

  // Single order — direct route
  if (valid.length === 1) {
    return [{ batchNumber: 1, route: buildOptimizedRoute(origin, valid) }];
  }

  // ≤10 orders — single batch
  if (valid.length <= 10) {
    const optimized =
      valid.length <= 8
        ? bruteForceOptimize(origin, valid)
        : nearestNeighborOptimize(origin, valid);

    return [{ batchNumber: 1, route: buildOptimizedRoute(origin, optimized) }];
  }

  // 10+ orders — cluster into batches of ≤8 and optimize each
  const clusters = clusterOrders(origin, valid, 8);
  return clusters.map((cluster, idx) => {
    const optimized =
      cluster.length <= 8
        ? bruteForceOptimize(origin, cluster)
        : nearestNeighborOptimize(origin, cluster);

    return {
      batchNumber: idx + 1,
      route: buildOptimizedRoute(origin, optimized),
    };
  });
}

/**
 * Formats distance in meters to a human-readable string.
 */
export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
