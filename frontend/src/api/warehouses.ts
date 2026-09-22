const API_URL = import.meta.env.VITE_API_URL as string;

export interface Warehouse {
  id: number;
  name: string;
  address: string | null;
  capacity: number | null;
  created_at: string;
  parcel_count: number;
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

export const warehousesApi = {
  list: (token: string) => request<Warehouse[]>("/warehouses", token),
  create: (token: string, data: { name: string; address?: string; capacity?: number }) =>
    request<Warehouse>("/warehouses", token, { method: "POST", body: JSON.stringify(data) }),
  update: (token: string, id: number, data: Partial<{ name: string; address: string; capacity: number }>) =>
    request<Warehouse>(`/warehouses/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (token: string, id: number) => request<void>(`/warehouses/${id}`, token, { method: "DELETE" }),
};
