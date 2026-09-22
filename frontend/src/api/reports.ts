const API_URL = import.meta.env.VITE_API_URL as string;

export interface ReportSummary {
  total_parcels: number;
  delivered: number;
  pending: number;
  delayed: number;
  in_transit: number;
  cancelled: number;
  revenue: number;
}

export const reportsApi = {
  getSummary: async (token: string, start: string, end: string): Promise<ReportSummary> => {
    const res = await fetch(`${API_URL}/reports/summary?start=${start}&end=${end}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load report summary");
    return res.json() as Promise<ReportSummary>;
  },
  downloadCsv: async (token: string, start: string, end: string) => {
    const res = await fetch(`${API_URL}/reports/export?start=${start}&end=${end}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to export report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `parcel_report_${start}_to_${end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
