import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { portalApi } from "../../api/portal";
import type { Invoice } from "../../api/invoices";
import { useAuth } from "../../context/AuthContext";

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

export function PortalInvoices() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    portalApi
      .listInvoices(token)
      .then(setInvoices)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownload(id: number, invoiceNumber: string) {
    if (!token) return;
    try {
      await portalApi.downloadInvoicePdf(token, id, invoiceNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download invoice");
    }
  }

  if (loading) return <div className="dashboard-status">Loading your invoices...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <FileText size={16} />
            </span>
            <h2>Your Invoices</h2>
            <span className="fleet-count-badge">{invoices.length}</span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p className="empty-state">You have no invoices yet.</p>
        ) : (
          invoices.map((inv) => (
            <div className="portal-parcel-card" key={inv.id}>
              <div className="portal-parcel-main">
                <span className="portal-parcel-tracking">{inv.invoice_number}</span>
                <span className="portal-parcel-meta">
                  {inv.period_start} → {inv.period_end}
                  {inv.due_date ? ` · Due ${inv.due_date}` : ""}
                </span>
              </div>
              <div className="portal-parcel-side">
                <span className={`status-badge invoice-status-${inv.status}`}>{inv.status}</span>
                <span className="portal-parcel-amount">{formatPkr(inv.amount)}</span>
                <button
                  type="button"
                  className="fleet-add-button"
                  onClick={() => handleDownload(inv.id, inv.invoice_number)}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
