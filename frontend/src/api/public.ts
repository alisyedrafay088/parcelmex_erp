import type { ParcelStatus } from "./parcels";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface PublicParcelTrack {
  tracking_id: string;
  status: ParcelStatus;
  destination_address: string | null;
  weight_kg: number;
  quantity: number;
  created_at: string;
  delivered_at: string | null;
  estimated_delivery_at: string | null;
}

export const publicApi = {
  trackParcel: async (trackingId: string): Promise<PublicParcelTrack> => {
    const res = await fetch(`${API_URL}/public/track/${encodeURIComponent(trackingId)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<PublicParcelTrack>;
  },
};
