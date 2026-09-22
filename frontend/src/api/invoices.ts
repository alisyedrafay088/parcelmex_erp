const API_URL = import.meta.env.VITE_API_URL as string;

export type InvoiceStatus = "unpaid" | "paid" | "overdue";

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  amount: number;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  due_date: string | null;
  issued_at: string;
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

export const invoicesApi = {
  list: (token: string) => request<Invoice[]>("/invoices", token),
  generate: (
    token: string,
    data: { client_id: number; period_start: string; period_end: string; due_date?: string },
  ) => request<Invoice>("/invoices/generate", token, { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (token: string, id: number, status: InvoiceStatus) =>
    request<Invoice>(`/invoices/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }),
  remove: (token: string, id: number) => request<void>(`/invoices/${id}`, token, { method: "DELETE" }),
  downloadPdf: async (token: string, id: number, filename: string) => {
    const res = await fetch(`${API_URL}/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to download invoice PDF");
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
