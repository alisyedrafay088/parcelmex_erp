import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, Clock, Download, Package, Phone, Plus, Trash2, Truck, Upload, User } from "lucide-react";
import { portalApi, type PortalParcel, type PortalSummary } from "../../api/portal";
import { useAuth } from "../../context/AuthContext";

interface DraftRow {
  description: string;
  destinationAddress: string;
  receiverName: string;
  receiverPhone: string;
  weightKg: string;
  quantity: string;
}

function emptyRow(): DraftRow {
  return {
    description: "",
    destinationAddress: "",
    receiverName: "",
    receiverPhone: "",
    weightKg: "",
    quantity: "1",
  };
}

const TEMPLATE_CSV =
  "destination_address,description,weight_kg,quantity\n" +
  '"House 12, Street 5, DHA Phase 6, Karachi",Sample item description,10,2\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "parcel_upload_template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PortalParcels() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [parcels, setParcels] = useState<PortalParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [bookError, setBookError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ created: number; errors: string[] } | null>(null);

  async function load() {
    if (!token) return;
    try {
      const [s, p] = await Promise.all([portalApi.getSummary(token), portalApi.listParcels(token)]);
      setSummary(s);
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

  function updateRow(index: number, field: keyof DraftRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBookError(null);

    for (const row of rows) {
      if (!row.destinationAddress.trim()) {
        setBookError("Every parcel needs a delivery address.");
        return;
      }
      if (!row.receiverName.trim()) {
        setBookError("Every parcel needs the consignee's (receiver's) name.");
        return;
      }
      if (!row.receiverPhone.trim()) {
        setBookError("Every parcel needs the consignee's (receiver's) phone number.");
        return;
      }
      if (!row.weightKg || Number(row.weightKg) <= 0) {
        setBookError("Every parcel needs a weight greater than 0.");
        return;
      }
    }

    try {
      await portalApi.bookParcelsBatch(
        token,
        rows.map((row) => ({
          description: row.description || undefined,
          destination_address: row.destinationAddress,
          receiver_name: row.receiverName,
          receiver_phone: row.receiverPhone,
          weight_kg: Number(row.weightKg),
          quantity: Number(row.quantity) || 1,
        })),
      );
      setRows([emptyRow()]);
      setShowForm(false);
      load();
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Failed to book parcel(s)");
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await portalApi.bulkUploadParcels(token, file);
      setUploadResult(result);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="dashboard-status">Loading your parcels...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}

      {summary && (
        <div className="card-grid">
          <div className="card">
            <div className="card-icon card-icon-blue">
              <Package size={20} />
            </div>
            <div>
              <div className="card-value">{summary.total_parcels}</div>
              <div className="card-label">Total Parcels</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon card-icon-blue">
              <Truck size={20} />
            </div>
            <div>
              <div className="card-value">{summary.in_transit}</div>
              <div className="card-label">In Transit</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon card-icon-green">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="card-value">{summary.delivered}</div>
              <div className="card-label">Delivered</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon card-icon-orange">
              <Clock size={20} />
            </div>
            <div>
              <div className="card-value">{summary.pending}</div>
              <div className="card-label">Pending</div>
            </div>
          </div>
        </div>
      )}

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Package size={16} />
            </span>
            <h2>Your Parcels</h2>
            <span className="fleet-count-badge">{parcels.length}</span>
          </div>
          <div className="fleet-row-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />
            <button
              type="button"
              className="fleet-add-button fleet-add-button-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={14} /> {uploading ? "Uploading..." : "Bulk Upload"}
            </button>
            <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
              <Plus size={14} /> Book a Parcel
            </button>
          </div>
        </div>

        <button type="button" className="portal-template-link" onClick={downloadTemplate}>
          <Download size={12} /> Download CSV template
        </button>

        {uploadResult && (
          <div className="portal-upload-result">
            <p>
              ✅ {uploadResult.created} parcel{uploadResult.created === 1 ? "" : "s"} booked successfully.
            </p>
            {uploadResult.errors.length > 0 && (
              <ul>
                {uploadResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {showForm && (
          <form className="portal-batch-form" onSubmit={handleBook}>
            {bookError && <p className="login-error">{bookError}</p>}
            {rows.map((row, index) => (
              <div className="portal-batch-row" key={index}>
                <span className="portal-batch-row-number">{index + 1}</span>
                <input
                  placeholder="What are you sending? (optional)"
                  value={row.description}
                  onChange={(e) => updateRow(index, "description", e.target.value)}
                />
                <input
                  placeholder="Delivery address"
                  value={row.destinationAddress}
                  onChange={(e) => updateRow(index, "destinationAddress", e.target.value)}
                  required
                />
                <input
                  placeholder="Consignee (receiver) name"
                  value={row.receiverName}
                  onChange={(e) => updateRow(index, "receiverName", e.target.value)}
                  required
                />
                <input
                  placeholder="Consignee (receiver) phone"
                  value={row.receiverPhone}
                  onChange={(e) => updateRow(index, "receiverPhone", e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={row.weightKg}
                  onChange={(e) => updateRow(index, "weightKg", e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={row.quantity}
                  onChange={(e) => updateRow(index, "quantity", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  title="Remove this parcel"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <div className="portal-batch-actions">
              <button type="button" className="fleet-add-button fleet-add-button-secondary" onClick={addRow}>
                <Plus size={14} /> Add Another Parcel
              </button>
              <button type="submit">
                Book {rows.length} Parcel{rows.length === 1 ? "" : "s"}
              </button>
            </div>
          </form>
        )}

        {parcels.length === 0 ? (
          <p className="empty-state">You have no parcels yet.</p>
        ) : (
          parcels.map((parcel) => (
            <div className="portal-parcel-card" key={parcel.id}>
              <div className="portal-parcel-top">
                <div className="portal-parcel-main">
                  <span className="portal-parcel-tracking">{parcel.tracking_id}</span>
                  <span className="portal-parcel-meta">
                    {parcel.weight_kg} kg · Booked {formatDate(parcel.created_at)}
                    {parcel.delivered_at ? ` · Delivered ${formatDate(parcel.delivered_at)}` : ""}
                  </span>
                  {parcel.destination_address && (
                    <span className="portal-parcel-meta">📍 {parcel.destination_address}</span>
                  )}
                  {parcel.description && <span className="portal-parcel-meta">{parcel.description}</span>}
                  {parcel.estimated_delivery_at && (
                    <span className="portal-parcel-meta">
                      🕒 Estimated delivery: {formatDate(parcel.estimated_delivery_at)}
                    </span>
                  )}
                  {parcel.rider_name && (
                    <span className="portal-parcel-rider">
                      <Truck size={13} />
                      <span>
                        <User size={12} /> {parcel.rider_name}
                      </span>
                      {parcel.rider_phone && (
                        <span>
                          <Phone size={12} /> {parcel.rider_phone}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="portal-parcel-side">
                  <span className={`status-badge parcel-status-${parcel.status}`}>
                    {parcel.status.replace("_", " ")}
                  </span>
                  <span className={parcel.amount > 0 ? "portal-parcel-amount" : "portal-parcel-amount-pending"}>
                    {parcel.amount > 0 ? formatPkr(parcel.amount) : "Pricing pending"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
