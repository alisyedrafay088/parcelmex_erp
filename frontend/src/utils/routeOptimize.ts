import type { GeoPoint } from "./geocode";

export interface OptimizedRoute {
  /** Indices into the `stops` array that was passed in, in the order they should be visited. */
  order: number[];
  /** [lat, lng] points describing the route path, for drawing on the map. */
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
  /** "osrm" = real road-network route, "fallback" = straight-line estimate (used when OSRM is unreachable). */
  provider: "osrm" | "fallback";
}

const OSRM_TRIP_URL = "https://router.project-osrm.org/trip/v1/driving";
const AVERAGE_CITY_SPEED_KMH = 30;

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Greedy nearest-neighbor ordering, used when the OSRM routing service can't be reached. */
function nearestNeighborRoute(start: GeoPoint, stops: GeoPoint[]): OptimizedRoute {
  const remaining = stops.map((_, i) => i);
  const order: number[] = [];
  const geometry: [number, number][] = [[start.lat, start.lng]];
  let current = start;
  let distanceKm = 0;

  while (remaining.length) {
    let bestPos = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, stops[remaining[i]]);
      if (d < bestDist) {
        bestDist = d;
        bestPos = i;
      }
    }
    const stopIndex = remaining.splice(bestPos, 1)[0];
    order.push(stopIndex);
    distanceKm += bestDist;
    current = stops[stopIndex];
    geometry.push([current.lat, current.lng]);
  }

  return {
    order,
    geometry,
    distanceKm,
    durationMin: (distanceKm / AVERAGE_CITY_SPEED_KMH) * 60,
    provider: "fallback",
  };
}

interface OsrmTripResponse {
  code: string;
  trips?: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
  waypoints?: { waypoint_index: number }[];
}

/**
 * Orders `stops` into the shortest one-way route starting from `start`, using OSRM's public
 * road-network routing service (solves an approximate travelling-salesman problem over the
 * given points). Falls back to a straight-line nearest-neighbor order if OSRM can't be reached.
 */
export async function optimizeRoute(start: GeoPoint, stops: GeoPoint[]): Promise<OptimizedRoute> {
  if (stops.length === 0) {
    return { order: [], geometry: [[start.lat, start.lng]], distanceKm: 0, durationMin: 0, provider: "osrm" };
  }

  const points = [start, ...stops];
  const coordString = points.map((p) => `${p.lng},${p.lat}`).join(";");

  try {
    const res = await fetch(
      `${OSRM_TRIP_URL}/${coordString}?source=first&roundtrip=false&overview=full&geometries=geojson`,
    );
    if (!res.ok) throw new Error("OSRM request failed");
    const data: OsrmTripResponse = await res.json();
    const trip = data.trips?.[0];
    if (data.code !== "Ok" || !trip || !data.waypoints) throw new Error("OSRM returned no trip");

    const stopWaypoints = data.waypoints.slice(1);
    const order = stopWaypoints
      .map((wp, stopIdx) => ({ stopIdx, sequence: wp.waypoint_index }))
      .sort((a, b) => a.sequence - b.sequence)
      .map((entry) => entry.stopIdx);

    const geometry: [number, number][] = trip.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    return {
      order,
      geometry,
      distanceKm: trip.distance / 1000,
      durationMin: trip.duration / 60,
      provider: "osrm",
    };
  } catch {
    return nearestNeighborRoute(start, stops);
  }
}
