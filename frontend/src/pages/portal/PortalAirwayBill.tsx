import { useEffect, useMemo, useState } from "react";
import { Printer, Search } from "lucide-react";
import { portalApi, type PortalParcel } from "../../api/portal";
import { useAuth } from "../../context/AuthContext";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PortalAirwayBill() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState<PortalParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");

  async function load() {
    if (!token) return;
    try {
      const p = await portalApi.listParcels(token);
      setParcels(p);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your parcels");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredParcels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parcels;
    return parcels.filter(
      (p) => p.tracking_id.toLowerCase().includes(q) || p.destination_address?.toLowerCase().includes(q),
    );
  }, [parcels, search]);

  const selectedParcel = parcels.find((p) => p.id === selectedId) ?? null;

  function selectParcel(parcel: PortalParcel) {
    setSelectedId(parcel.id);
    setReceiverName(parcel.receiver_name ?? "");
    setReceiverPhone(parcel.receiver_phone ?? "");
    setDestinationAddress(parcel.destination_address ?? "");
    setError(null);
  }

  async function handleGenerate() {
    if (!token || !selectedParcel) return;
    setGenerating(true);
    setError(null);
    try {
      const changed =
        receiverName !== (selectedParcel.receiver_name ?? "") ||
        receiverPhone !== (selectedParcel.receiver_phone ?? "") ||
        destinationAddress !== (selectedParcel.destination_address ?? "");

      if (changed) {
        await portalApi.updateParcel(token, selectedParcel.id, {
          receiver_name: receiverName || undefined,
          receiver_phone: receiverPhone || undefined,
          destination_address: destinationAddress || undefined,
        });
        await load();
      }
      await portalApi.downloadAirwayBill(token, selectedParcel.id, selectedParcel.tracking_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate airway bill");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="dashboard-status">Loading parcels...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Printer size={16} />
            </span>
            <h2>Airway Bill</h2>
          </div>
        </div>

        <div className="airway-layout">
          <div className="airway-picker">
            <div className="login-input-wrap airway-search-wrap">
              <Search size={16} />
              <input
                placeholder="Search by tracking ID or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="airway-parcel-list">
              {filteredParcels.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`airway-parcel-item ${selectedId === p.id ? "airway-parcel-item-selected" : ""}`}
                  onClick={() => selectParcel(p)}
                >
                  <span className="airway-parcel-item-title">{p.tracking_id}</span>
                  <span className="airway-parcel-item-sub">{p.destination_address ?? "No address"}</span>
                </button>
              ))}
              {filteredParcels.length === 0 && <p className="empty-state">No parcels found.</p>}
            </div>
          </div>

          <div className="airway-form">
            {!selectedParcel && (
              <p className="empty-state">Select a parcel on the left to fill in and generate its airway bill.</p>
            )}

            {selectedParcel && (
              <>
                <h3 className="airway-form-heading">Consignee Information</h3>
                <div className="fleet-inline-form airway-fields">
                  <input
                    placeholder="Receiver name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />
                  <input
                    placeholder="Receiver phone"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />
                  <input
                    placeholder="Delivery address"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    className="airway-address-input"
                  />
                </div>

                <h3 className="airway-form-heading">Shipment Details</h3>
                <div className="airway-preview-grid">
                  <div>
                    <span className="airway-preview-label">Tracking No</span>
                    <span className="airway-preview-value">{selectedParcel.tracking_id}</span>
                  </div>
                  <div>
                    <span className="airway-preview-label">Pieces</span>
                    <span className="airway-preview-value">{selectedParcel.quantity}</span>
                  </div>
                  <div>
                    <span className="airway-preview-label">Weight</span>
                    <span className="airway-preview-value">{selectedParcel.weight_kg} kg</span>
                  </div>
                  <div>
                    <span className="airway-preview-label">Amount</span>
                    <span className="airway-preview-value">
                      {selectedParcel.amount ? `PKR ${Math.round(selectedParcel.amount).toLocaleString()}` : "Pending"}
                    </span>
                  </div>
                  <div>
                    <span className="airway-preview-label">Booking Date</span>
                    <span className="airway-preview-value">{formatDate(selectedParcel.created_at)}</span>
                  </div>
                  <div>
                    <span className="airway-preview-label">Status</span>
                    <span className="airway-preview-value">{selectedParcel.status.replace("_", " ")}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="fleet-add-button airway-generate-button"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  <Printer size={14} /> {generating ? "Generating..." : "Save & Generate Airway Bill"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
