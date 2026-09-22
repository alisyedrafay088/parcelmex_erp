import type { ParcelStatus } from "./parcels";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface ParcelSearchResult {
  id: number;
  tracking_id: string;
  status: ParcelStatus;
  destination_address: string | null;
  client_name: string;
}

export interface RiderSearchResult {
  id: number;
  name: string;
  phone: string | null;
}

export interface ClientSearchResult {
  id: number;
  name: string;
  email: string;
}

export interface SearchResults {
  parcels: ParcelSearchResult[];
  riders: RiderSearchResult[];
  clients: ClientSearchResult[];
}

export const searchApi = {
  search: async (token: string, q: string, signal?: AbortSignal): Promise<SearchResults> => {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<SearchResults>;
  },
};
