import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, Download } from "lucide-react";
import { reportsApi, type ReportSummary } from "../api/reports";
import { useAuth } from "../context/AuthContext";

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

export function Reports() {
  const { token } = useAuth();
  const [start, setStart] = useState(firstOfMonthStr());
  const [end, setEnd] = useState(todayStr());
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    if (!token) return;
    try {
      const data = await reportsApi.getSummary(token, start, end);
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    loadSummary();
  }

  async function handleExport() {
    if (!token) return;
    try {
      await reportsApi.downloadCsv(token, start, end);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report");
    }
  }

  return (
    <div className="dashboard">
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <BarChart3 size={16} />
            </span>
            <h2>Reports</h2>
          </div>
        </div>

        <form className="fleet-inline-form" onSubmit={handleGenerate}>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          <button type="submit">Generate</button>
          <button type="button" className="fleet-add-button" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
        </form>

        {error && <p className="login-error">{error}</p>}

        {summary && (
          <div className="card-grid">
            <div className="card">
              <div className="card-icon card-icon-blue">
                <BarChart3 size={20} />
              </div>
              <div>
                <div className="card-value">{summary.total_parcels}</div>
                <div className="card-label">Total Parcels</div>
              </div>
            </div>
            <div className="card">
              <div className="card-icon card-icon-green">
                <BarChart3 size={20} />
              </div>
              <div>
                <div className="card-value">{summary.delivered}</div>
                <div className="card-label">Delivered</div>
              </div>
            </div>
            <div className="card">
              <div className="card-icon card-icon-orange">
                <BarChart3 size={20} />
              </div>
              <div>
                <div className="card-value">{summary.pending}</div>
                <div className="card-label">Pending</div>
              </div>
            </div>
            <div className="card">
              <div className="card-icon card-icon-red">
                <BarChart3 size={20} />
              </div>
              <div>
                <div className="card-value">{summary.delayed}</div>
                <div className="card-label">Delayed</div>
              </div>
            </div>
            <div className="card">
              <div className="card-icon card-icon-blue">
                <BarChart3 size={20} />
              </div>
              <div>
                <div className="card-value">{formatPkr(summary.revenue)}</div>
                <div className="card-label">Revenue</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
