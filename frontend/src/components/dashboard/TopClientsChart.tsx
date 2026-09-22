import type { TopClientPoint } from "../../api/dashboard";

interface Props {
  clients: TopClientPoint[];
}

const COLORS = ["#2563eb", "#f5a623", "#2ecc71", "#9b59b6", "#e74c3c", "#0ea5e9"];

export function TopClientsChart({ clients }: Props) {
  const max = Math.max(...clients.map((c) => c.parcel_count), 1);

  return (
    <div className="panel">
      <h3>Top Clients by Parcels</h3>
      {clients.length === 0 ? (
        <p className="empty-state">No client data yet.</p>
      ) : (
        <div className="hbar-chart">
          {clients.map((c, i) => (
            <div className="hbar-row" key={c.client_id}>
              <span className="hbar-label" title={c.client_name}>
                {c.client_name}
              </span>
              <div className="hbar-track">
                <div
                  className="hbar-fill"
                  style={{ width: `${(c.parcel_count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
              <span className="hbar-value">{c.parcel_count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
