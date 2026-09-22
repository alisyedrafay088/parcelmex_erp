import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { portalApi, type PortalParcel } from "../../api/portal";
import { useAuth } from "../../context/AuthContext";

export function PortalFleet() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState<PortalParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    portalApi
      .listParcels(token)
      .then((p) => {
        setParcels(p);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load fleet info");
        setLoading(false);
      });
  }, [token]);

  const withRider = parcels.filter((p) => p.rider_name);

  if (loading) return <div className="dashboard-status">Loading fleet info...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Truck size={16} />
            </span>
            <h2>Riders Carrying Your Parcels</h2>
            <span className="fleet-count-badge">{withRider.length}</span>
          </div>
        </div>

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Rider</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {withRider.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="plate-badge">{p.tracking_id}</span>
                </td>
                <td>{p.rider_name}</td>
                <td className="fleet-muted">{p.rider_phone || "—"}</td>
                <td>
                  <span className={`status-badge parcel-status-${p.status}`}>{p.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
            {withRider.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  No rider assigned to your parcels yet.
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
