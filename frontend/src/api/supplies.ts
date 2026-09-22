const API_URL = import.meta.env.VITE_API_URL as string;

export interface Supply {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  reorder_level: number | null;
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

export const suppliesApi = {
  list: (token: string) => request<Supply[]>("/supplies", token),
  create: (token: string, data: { name: string; unit: string; quantity: number; reorder_level?: number }) =>
    request<Supply>("/supplies", token, { method: "POST", body: JSON.stringify(data) }),
  update: (
    token: string,
    id: number,
    data: Partial<{ name: string; unit: string; quantity: number; reorder_level: number }>,
  ) => request<Supply>(`/supplies/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (token: string, id: number) => request<void>(`/supplies/${id}`, token, { method: "DELETE" }),
};
