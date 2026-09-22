const API_URL = import.meta.env.VITE_API_URL as string;

export type ClientPlan = "basic" | "standard" | "premium";
export type ClientStatus = "active" | "inactive";

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  plan: ClientPlan;
  status: ClientStatus;
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

export const clientsApi = {
  list: (token: string) => request<Client[]>("/clients", token),
  create: (token: string, data: { name: string; email: string; phone?: string; plan: ClientPlan }) =>
    request<Client>("/clients", token, { method: "POST", body: JSON.stringify(data) }),
  update: (
    token: string,
    id: number,
    data: Partial<{ name: string; email: string; phone: string; plan: ClientPlan; status: ClientStatus }>,
  ) => request<Client>(`/clients/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (token: string, id: number) => request<void>(`/clients/${id}`, token, { method: "DELETE" }),
  createPortalAccount: (token: string, id: number, data: { username: string; password: string }) =>
    request(`/clients/${id}/portal-account`, token, { method: "POST", body: JSON.stringify(data) }),
};
