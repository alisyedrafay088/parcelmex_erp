const API_URL = import.meta.env.VITE_API_URL as string;

export type ParcelStatus = "pending" | "picked" | "packed" | "in_transit" | "delivered" | "delayed" | "cancelled";
export type AddressVerificationStatus = "unverified" | "verified" | "needs_review";

export interface Parcel {
  id: number;
  tracking_id: string;
  client_id: number;
  rider_id: number | null;
  warehouse_id: number | null;
  status: ParcelStatus;
  description: string | null;
  destination_address: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  weight_kg: number;
  quantity: number;
  rate_per_kg: number;
  amount: number;
  address_status: AddressVerificationStatus;
  address_lat: number | null;
  address_lng: number | null;
  address_verified_at: string | null;
  created_at: string;
  delivered_at: string | null;
  estimated_delivery_at: string | null;
}

export const DEFAULT_RATE_PER_KG = 50;

export interface ParcelTrackResult extends Parcel {
  client_name: string;
  rider_name: string | null;
  rider_phone: string | null;
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const parcelsApi = {
  list: (token: string) => request<Parcel[]>("/parcels", token),
  track: (token: string, trackingId: string) =>
    request<ParcelTrackResult>(`/parcels/track/${encodeURIComponent(trackingId)}`, token),
  create: (
    token: string,
    data: {
      client_id: number;
      rider_id?: number | null;
      warehouse_id?: number | null;
      description?: string;
      destination_address?: string;
      receiver_name?: string;
      receiver_phone?: string;
      weight_kg: number;
      quantity: number;
      rate_per_kg: number;
    },
  ) => request<Parcel>("/parcels", token, { method: "POST", body: JSON.stringify(data) }),
  update: (
    token: string,
    id: number,
    data: Partial<{
      rider_id: number | null;
      warehouse_id: number | null;
      status: ParcelStatus;
      description: string;
      destination_address: string;
      receiver_name: string;
      receiver_phone: string;
      weight_kg: number;
      rate_per_kg: number;
    }>,
  ) => request<Parcel>(`/parcels/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (token: string, id: number) => request<void>(`/parcels/${id}`, token, { method: "DELETE" }),
  verifyAddress: (
    token: string,
    id: number,
    data: { status: AddressVerificationStatus; lat?: number; lng?: number; destination_address?: string },
  ) => request<Parcel>(`/parcels/${id}/address-verification`, token, { method: "PATCH", body: JSON.stringify(data) }),
  downloadAirwayBill: async (token: string, id: number, trackingId: string) => {
    const res = await fetch(`${API_URL}/parcels/${id}/airway-bill`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to generate airway bill");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${trackingId}-airway-bill.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
