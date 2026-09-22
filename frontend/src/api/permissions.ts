const API_URL = import.meta.env.VITE_API_URL as string;

export type PermissionMatrix = Record<string, Record<string, boolean>>;

export interface PermissionMatrixResponse {
  features: string[];
  roles: string[];
  matrix: PermissionMatrix;
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

export const permissionsApi = {
  getMatrix: (token: string) => request<PermissionMatrixResponse>("/permissions/matrix", token),
  updateMatrix: (token: string, matrix: PermissionMatrix) =>
    request<PermissionMatrixResponse>("/permissions/matrix", token, {
      method: "PUT",
      body: JSON.stringify({ matrix }),
    }),
  getMyFeatures: (token: string) =>
    request<{ features: string[] }>("/permissions/me", token).then((r) => r.features),
};
