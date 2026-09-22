const API_URL = import.meta.env.VITE_API_URL as string;

export type ExpenseCategory = "salary" | "bills" | "travelling" | "owner_expense" | "utilities" | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "salary",
  "bills",
  "travelling",
  "owner_expense",
  "utilities",
  "other",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salary: "Employee Salaries",
  bills: "Bills",
  travelling: "Travelling",
  owner_expense: "Owner Expense",
  utilities: "Utilities",
  other: "Other",
};

export interface Expense {
  id: number;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

export interface ExpenseSummary {
  total: number;
  by_category: Partial<Record<ExpenseCategory, number>>;
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

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const expensesApi = {
  list: (token: string, filters: { start?: string; end?: string; category?: ExpenseCategory } = {}) =>
    request<Expense[]>(`/expenses${buildQuery(filters)}`, token),
  summary: (token: string, filters: { start?: string; end?: string } = {}) =>
    request<ExpenseSummary>(`/expenses/summary${buildQuery(filters)}`, token),
  create: (
    token: string,
    data: { category: ExpenseCategory; title: string; amount: number; expense_date: string; notes?: string },
  ) => request<Expense>("/expenses", token, { method: "POST", body: JSON.stringify(data) }),
  update: (
    token: string,
    id: number,
    data: Partial<{ category: ExpenseCategory; title: string; amount: number; expense_date: string; notes: string }>,
  ) => request<Expense>(`/expenses/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (token: string, id: number) => request<void>(`/expenses/${id}`, token, { method: "DELETE" }),
  downloadReport: async (
    token: string,
    filters: { start?: string; end?: string; category?: ExpenseCategory } = {},
  ) => {
    const res = await fetch(`${API_URL}/expenses/report/pdf${buildQuery(filters)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to generate expense report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "operating-expenses-report.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
