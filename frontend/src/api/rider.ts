import type { Parcel, ParcelStatus } from "./parcels";
import type { RiderStatus } from "./fleet";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface RiderMe {
  id: number;
  name: string;
  phone: string | null;
  status: RiderStatus;
}

export interface RiderParcel extends Parcel {
  client_name: string;
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
  return res.json() as Promise<T>;
}

export const riderApi = {
  getMe: (token: string) => request<RiderMe>("/rider/me", token),
  updateMyStatus: (token: string, status: RiderStatus) =>
    request<RiderMe>("/rider/status", token, { method: "PATCH", body: JSON.stringify({ status }) }),
  updateMyLocation: (token: string, lat: number, lng: number) =>
    request<RiderMe>("/rider/location", token, { method: "PATCH", body: JSON.stringify({ lat, lng }) }),
  listParcels: (token: string) => request<RiderParcel[]>("/rider/parcels", token),
  updateParcelStatus: (token: string, id: number, status: ParcelStatus) =>
    request<RiderParcel>(`/rider/parcels/${id}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
