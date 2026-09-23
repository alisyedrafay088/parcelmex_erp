const API_URL = import.meta.env.VITE_API_URL as string;

export type UserRole = "owner" | "support" | "dispatch" | "finance" | "client" | "rider";

export interface StaffUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  client_id: number | null;
  rider_id: number | null;
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

export const usersApi = {
  list: (token: string) => request<StaffUser[]>("/users", token),
  create: (
    token: string,
    data: { name: string; username: string; email: string; password: string; role: UserRole },
  ) => request<StaffUser>("/users", token, { method: "POST", body: JSON.stringify(data) }),
  updateRole: (token: string, id: number, role: UserRole) =>
    request<StaffUser>(`/users/${id}`, token, { method: "PATCH", body: JSON.stringify({ role }) }),
  resetPassword: (token: string, id: number, password: string) =>
    request<StaffUser>(`/users/${id}`, token, { method: "PATCH", body: JSON.stringify({ password }) }),
  remove: (token: string, id: number) => request<void>(`/users/${id}`, token, { method: "DELETE" }),
};
