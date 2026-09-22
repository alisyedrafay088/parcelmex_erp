const API_URL = import.meta.env.VITE_API_URL as string;

export interface OverviewData {
  total_parcels: number;
  active_riders: number;
  pending_count: number;
  delivered_count: number;
  delayed_count: number;
}

export interface RevenueData {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface StatusOverviewData {
  pending: number;
  delivered: number;
  delayed: number;
  in_transit: number;
  cancelled: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface TrendsData {
  points: TrendPoint[];
}

export interface TopClientPoint {
  client_id: number;
  client_name: string;
  parcel_count: number;
}

export interface TopClientsData {
  clients: TopClientPoint[];
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const dashboardApi = {
  getOverview: (token: string) => getJson<OverviewData>("/dashboard/overview", token),
  getRevenue: (token: string) => getJson<RevenueData>("/dashboard/revenue", token),
  getStatusOverview: (token: string) =>
    getJson<StatusOverviewData>("/dashboard/status-overview", token),
  getTrends: (token: string, days = 30) =>
    getJson<TrendsData>(`/dashboard/trends?days=${days}`, token),
  getTopClients: (token: string, limit = 6) =>
    getJson<TopClientsData>(`/dashboard/top-clients?limit=${limit}`, token),
};
