import { useEffect, useState, type FormEvent } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { invoicesApi, type Invoice, type InvoiceStatus } from "../api/invoices";
import { clientsApi, type Client } from "../api/clients";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

const STATUSES: InvoiceStatus[] = ["unpaid", "paid", "overdue"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

export function Invoicing() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState(firstOfMonthStr());
  const [periodEnd, setPeriodEnd] = useState(todayStr());
  const [dueDate, setDueDate] = useState("");

  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? `#${id}`;

  async function load() {
    if (!token) return;
    try {
      const [inv, cl] = await Promise.all([invoicesApi.list(token), clientsApi.list(token)]);
      setInvoices(inv);
      setClients(cl);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!token || !clientId) return;
    try {
      await invoicesApi.generate(token, {
        client_id: Number(clientId),
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate || undefined,
      });
      setShowForm(false);
      setDueDate("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invoice");
    }
  }

  async function handleStatusChange(id: number, status: InvoiceStatus) {
    if (!token) return;
    await invoicesApi.updateStatus(token, id, status);
    load();
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const invoice = invoices.find((i) => i.id === id);
    const ok = await confirm({
      title: "Delete invoice?",
      message: `Delete invoice "${invoice?.invoice_number ?? "#" + id}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await invoicesApi.remove(token, id);
    load();
  }

  async function handleDownload(id: number, invoiceNumber: string) {
    if (!token) return;
    try {
      await invoicesApi.downloadPdf(token, id, invoiceNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download invoice");
    }
  }

  if (loading) return <div className="dashboard-status">Loading invoices...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <FileText size={16} />
            </span>
            <h2>Invoicing</h2>
            <span className="fleet-count-badge">{invoices.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
            <Plus size={14} /> Generate Invoice
          </button>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleGenerate}>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="Due date (optional)"
            />
            <button type="submit">Generate</button>
          </form>
        )}

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <span className="plate-badge">{inv.invoice_number}</span>
                </td>
                <td>{clientName(inv.client_id)}</td>
                <td className="fleet-muted">
                  {inv.period_start} → {inv.period_end}
                </td>
                <td>
                  <strong>{formatPkr(inv.amount)}</strong>
                </td>
                <td className="fleet-muted">{inv.due_date || "—"}</td>
                <td>
                  <select
                    className={`pill-select invoice-status-${inv.status}`}
                    value={inv.status}
                    onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="fleet-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Download PDF"
                      onClick={() => handleDownload(inv.id, inv.invoice_number)}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(inv.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
