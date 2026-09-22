import { useEffect, useState, type FormEvent } from "react";
import { FileText, Package, Plus, Trash2 } from "lucide-react";
import { parcelsApi, type Parcel, type ParcelStatus, DEFAULT_RATE_PER_KG } from "../api/parcels";
import { clientsApi, type Client } from "../api/clients";
import { fleetApi, type Rider } from "../api/fleet";
import { warehousesApi, type Warehouse } from "../api/warehouses";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

const STATUSES: ParcelStatus[] = ["pending", "picked", "packed", "in_transit", "delivered", "delayed", "cancelled"];

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function AmountCell({ parcel, onSave }: { parcel: Parcel; onSave: (amount: number) => void }) {
  const [value, setValue] = useState(String(parcel.amount));

  useEffect(() => {
    setValue(String(parcel.amount));
  }, [parcel.amount]);

  function commit() {
    const num = Number(value);
    if (!Number.isNaN(num) && num !== parcel.amount) {
      onSave(num);
    } else {
      setValue(String(parcel.amount));
    }
  }

  return (
    <div className="amount-input-wrap">
      <span>PKR</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={parcel.amount === 0 ? "amount-input-pending" : undefined}
      />
    </div>
  );
}

export function Parcels() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [filterClientId, setFilterClientId] = useState("");
  const [clientId, setClientId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [description, setDescription] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [ratePerKg, setRatePerKg] = useState(String(DEFAULT_RATE_PER_KG));

  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? `#${id}`;

  const previewAmount = (Number(weightKg) || 0) * (Number(ratePerKg) || 0);

  const filteredParcels = filterClientId
    ? parcels.filter((p) => p.client_id === Number(filterClientId))
    : parcels;

  async function load() {
    if (!token) return;
    try {
      const [p, c, r, w] = await Promise.all([
        parcelsApi.list(token),
        clientsApi.list(token),
        fleetApi.listRiders(token),
        warehousesApi.list(token),
      ]);
      setParcels(p);
      setClients(c);
      setRiders(r);
      setWarehouses(w);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load parcels");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !clientId) return;
    try {
      await parcelsApi.create(token, {
        client_id: Number(clientId),
        rider_id: riderId ? Number(riderId) : null,
        warehouse_id: warehouseId ? Number(warehouseId) : null,
        description: description || undefined,
        destination_address: destinationAddress || undefined,
        receiver_name: receiverName || undefined,
        receiver_phone: receiverPhone || undefined,
        weight_kg: Number(weightKg),
        quantity: Number(quantity),
        rate_per_kg: Number(ratePerKg),
      });
      setClientId("");
      setRiderId("");
      setWarehouseId("");
      setDescription("");
      setDestinationAddress("");
      setReceiverName("");
      setReceiverPhone("");
      setWeightKg("");
      setQuantity("1");
      setRatePerKg(String(DEFAULT_RATE_PER_KG));
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add parcel");
    }
  }

  async function handleStatusChange(id: number, status: ParcelStatus) {
    if (!token) return;
    await parcelsApi.update(token, id, { status });
    load();
  }

  async function handleAmountChange(id: number, amount: number) {
    if (!token) return;
    await parcelsApi.update(token, id, { amount });
    load();
  }

  async function handleRiderChange(id: number, newRiderId: string) {
    if (!token) return;
    await parcelsApi.update(token, id, { rider_id: newRiderId ? Number(newRiderId) : null });
    load();
  }

  async function handleWarehouseChange(id: number, newWarehouseId: string) {
    if (!token) return;
    await parcelsApi.update(token, id, { warehouse_id: newWarehouseId ? Number(newWarehouseId) : null });
    load();
  }

  async function handleDownloadAirwayBill(id: number, trackingId: string) {
    if (!token) return;
    try {
      await parcelsApi.downloadAirwayBill(token, id, trackingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate airway bill");
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const parcel = parcels.find((p) => p.id === id);
    const ok = await confirm({
      title: "Delete parcel?",
      message: `Delete parcel "${parcel?.tracking_id ?? "#" + id}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await parcelsApi.remove(token, id);
    load();
  }

  if (loading) return <div className="dashboard-status">Loading parcels...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Package size={16} />
            </span>
            <h2>Parcels</h2>
            <span className="fleet-count-badge">{filteredParcels.length}</span>
          </div>
          <div className="fleet-section-actions">
            <select
              className="pill-select plain-select"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
            >
              <option value="">All customers</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="fleet-add-button"
              onClick={() => {
                setShowForm((s) => {
                  if (!s) setClientId(filterClientId);
                  return !s;
                });
              }}
            >
              <Plus size={14} /> Book Parcel
            </button>
          </div>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleAdd}>
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
            <select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
              <option value="">Unassigned rider</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">No warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              placeholder="Destination address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              required
            />
            <input
              placeholder="Receiver name (for airway bill)"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
            />
            <input
              placeholder="Receiver phone"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
            />
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Weight (kg)"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Rate / kg (PKR)"
              value={ratePerKg}
              onChange={(e) => setRatePerKg(e.target.value)}
              required
            />
            <span className="parcel-amount-preview">= {formatPkr(previewAmount)}</span>
            <button type="submit">Save</button>
          </form>
        )}

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Client</th>
              <th>Details</th>
              <th>Weight</th>
              <th>Rate/kg</th>
              <th>Amount</th>
              <th>Rider</th>
              <th>Warehouse</th>
              <th>Est. Delivery</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredParcels.map((parcel) => (
              <tr key={parcel.id}>
                <td>
                  <span className="plate-badge">{parcel.tracking_id}</span>
                </td>
                <td>{clientName(parcel.client_id)}</td>
                <td className="fleet-details-cell">
                  {parcel.destination_address && <div>📍 {parcel.destination_address}</div>}
                  {parcel.description && <div className="fleet-muted">{parcel.description}</div>}
                  {!parcel.destination_address && !parcel.description && (
                    <span className="fleet-muted">—</span>
                  )}
                </td>
                <td className="fleet-muted">
                  {parcel.weight_kg} kg
                  {parcel.quantity > 1 ? ` (${parcel.quantity} pcs)` : ""}
                </td>
                <td className="fleet-muted">
                  {parcel.rate_per_kg > 0 ? formatPkr(parcel.rate_per_kg) : "—"}
                </td>
                <td>
                  <AmountCell parcel={parcel} onSave={(amount) => handleAmountChange(parcel.id, amount)} />
                </td>
                <td>
                  <select
                    className="pill-select plain-select"
                    value={parcel.rider_id ?? ""}
                    onChange={(e) => handleRiderChange(parcel.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="pill-select plain-select"
                    value={parcel.warehouse_id ?? ""}
                    onChange={(e) => handleWarehouseChange(parcel.id, e.target.value)}
                  >
                    <option value="">No warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="fleet-muted">
                  {parcel.estimated_delivery_at ? formatDate(parcel.estimated_delivery_at) : "—"}
                </td>
                <td>
                  <select
                    className={`pill-select parcel-status-${parcel.status}`}
                    value={parcel.status}
                    onChange={(e) => handleStatusChange(parcel.id, e.target.value as ParcelStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="fleet-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDownloadAirwayBill(parcel.id, parcel.tracking_id)}
                      title="Print airway bill"
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(parcel.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredParcels.length === 0 && (
              <tr>
                <td colSpan={11} className="empty-state">
                  {filterClientId ? "No parcels for this customer." : "No parcels booked yet."}
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
