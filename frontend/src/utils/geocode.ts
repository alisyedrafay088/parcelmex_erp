export interface GeoPoint {
  lat: number;
  lng: number;
}

const cache = new Map<string, GeoPoint | null>();

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
    );
    if (!res.ok) throw new Error("Geocoding request failed");
    const data: { lat: string; lon: string }[] = await res.json();
    const result = data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
