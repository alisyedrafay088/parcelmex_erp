const API_URL = import.meta.env.VITE_API_URL as string;

export type RiderStatus = "active" | "idle" | "offline";
export type VehicleStatus = "active" | "idle" | "maintenance";

export interface Rider {
  id: number;
  name: string;
  phone: string | null;
  status: RiderStatus;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  plate_number: string;
  type: string;
  status: VehicleStatus;
  rider_id: number | null;
  created_at: string;
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

export const fleetApi = {
  listRiders: (token: string) => request<Rider[]>("/fleet/riders", token),
  createRider: (token: string, data: { name: string; phone?: string; status: RiderStatus }) =>
    request<Rider>("/fleet/riders", token, { method: "POST", body: JSON.stringify(data) }),
  updateRider: (token: string, id: number, data: Partial<{ name: string; phone: string; status: RiderStatus }>) =>
    request<Rider>(`/fleet/riders/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRider: (token: string, id: number) =>
    request<void>(`/fleet/riders/${id}`, token, { method: "DELETE" }),
  createRiderPortalAccount: (token: string, id: number, data: { username: string; password: string }) =>
    request(`/fleet/riders/${id}/portal-account`, token, { method: "POST", body: JSON.stringify(data) }),

  listVehicles: (token: string) => request<Vehicle[]>("/fleet/vehicles", token),
  createVehicle: (
    token: string,
    data: { plate_number: string; type: string; status: VehicleStatus; rider_id: number | null },
  ) => request<Vehicle>("/fleet/vehicles", token, { method: "POST", body: JSON.stringify(data) }),
  updateVehicle: (
    token: string,
    id: number,
    data: Partial<{ plate_number: string; type: string; status: VehicleStatus; rider_id: number | null }>,
  ) => request<Vehicle>(`/fleet/vehicles/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  deleteVehicle: (token: string, id: number) =>
    request<void>(`/fleet/vehicles/${id}`, token, { method: "DELETE" }),
};
