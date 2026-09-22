import type { AddressVerificationStatus, Parcel } from "./parcels";
import type { Invoice } from "./invoices";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface PortalClient {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  status: string;
}

export interface PortalSummary {
  total_parcels: number;
  in_transit: number;
  delivered: number;
  pending: number;
}

export interface BulkUploadResult {
  created: number;
  errors: string[];
}

export interface PortalParcel extends Parcel {
  rider_name: string | null;
  rider_phone: string | null;
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

export const portalApi = {
  getMe: (token: string) => request<PortalClient>("/portal/me", token),
  getSummary: (token: string) => request<PortalSummary>("/portal/summary", token),
  listParcels: (token: string) => request<PortalParcel[]>("/portal/parcels", token),
  trackParcel: (token: string, trackingId: string) =>
    request<PortalParcel>(`/portal/parcels/track/${encodeURIComponent(trackingId)}`, token),
  updateParcel: (
    token: string,
    id: number,
    data: Partial<{ destination_address: string; receiver_name: string; receiver_phone: string }>,
  ) => request<Parcel>(`/portal/parcels/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  verifyAddress: (
    token: string,
    id: number,
    data: { status: AddressVerificationStatus; lat?: number; lng?: number; destination_address?: string },
  ) =>
    request<Parcel>(`/portal/parcels/${id}/address-verification`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  bookParcel: (
    token: string,
    data: {
      description?: string;
      destination_address: string;
      receiver_name?: string;
      receiver_phone?: string;
      weight_kg: number;
      quantity: number;
    },
  ) => request<Parcel>("/portal/parcels", token, { method: "POST", body: JSON.stringify(data) }),
  bookParcelsBatch: (
    token: string,
    items: {
      description?: string;
      destination_address: string;
      receiver_name?: string;
      receiver_phone?: string;
      weight_kg: number;
      quantity: number;
    }[],
  ) => request<Parcel[]>("/portal/parcels/batch", token, { method: "POST", body: JSON.stringify({ items }) }),
  bulkUploadParcels: async (token: string, file: File): Promise<BulkUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/portal/parcels/bulk-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? "Bulk upload failed");
    }
    return res.json() as Promise<BulkUploadResult>;
  },
  downloadAirwayBill: async (token: string, id: number, trackingId: string) => {
    const res = await fetch(`${API_URL}/portal/parcels/${id}/airway-bill`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to generate airway bill");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${trackingId}-airway-bill.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  listInvoices: (token: string) => request<Invoice[]>("/portal/invoices", token),
  downloadInvoicePdf: async (token: string, id: number, filename: string) => {
    const res = await fetch(`${API_URL}/portal/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to download invoice");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
