import { Fragment, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, PackagePlus, Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { warehousesApi, type Warehouse } from "../api/warehouses";
import { clientsApi, type Client } from "../api/clients";
import { parcelsApi, type Parcel } from "../api/parcels";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

function StoredParcelsPanel({
  warehouse,
  parcels,
  clients,
  onChanged,
}: {
  warehouse: Warehouse;
  parcels: Parcel[];
  clients: Client[];
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [clientId, setClientId] = useState("");
  const [parcelId, setParcelId] = useState("");

  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? `#${id}`;

  const stored = parcels.filter((p) => p.warehouse_id === warehouse.id);
  const availableParcels = parcels.filter(
    (p) => p.warehouse_id !== warehouse.id && (!clientId || p.client_id === Number(clientId)),
  );

  async function handleStore() {
    if (!token || !parcelId) return;
    await parcelsApi.update(token, Number(parcelId), { warehouse_id: warehouse.id });
    setParcelId("");
    onChanged();
  }

  async function handleRemove(id: number) {
    if (!token) return;
    await parcelsApi.update(token, id, { warehouse_id: null });
    onChanged();
  }

  return (
    <tr className="warehouse-expand-row">
      <td colSpan={5}>
        <div className="warehouse-store-form">
          <div className="warehouse-store-field">
            <label>Customer</label>
            <select
              className="warehouse-select"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setParcelId("");
              }}
            >
              <option value="">Select customer</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="warehouse-store-field">
            <label>Parcel</label>
            <select className="warehouse-select" value={parcelId} onChange={(e) => setParcelId(e.target.value)}>
              <option value="">Select parcel</option>
              {availableParcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tracking_id} — {p.quantity} pcs{p.description ? ` (${p.description})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="fleet-add-button warehouse-store-button"
            onClick={handleStore}
            disabled={!parcelId}
          >
            <PackagePlus size={14} /> Store in Warehouse
          </button>
        </div>

        <div className="table-scroll">
        <table className="fleet-table warehouse-stored-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stored.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="plate-badge">{p.tracking_id}</span>
                </td>
                <td>{clientName(p.client_id)}</td>
                <td className="fleet-muted">{p.quantity}</td>
                <td className="fleet-muted">{p.description || "—"}</td>
                <td>
                  <button type="button" className="icon-button icon-button-danger" onClick={() => handleRemove(p.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {stored.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No parcels stored in this warehouse yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </td>
    </tr>
  );
}

export function Warehouses() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");

  async function load() {
    if (!token) return;
    try {
      const [w, c, p] = await Promise.all([
        warehousesApi.list(token),
        clientsApi.list(token),
        parcelsApi.list(token),
      ]);
      setWarehouses(w);
      setClients(c);
      setParcels(p);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load warehouses");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !name) return;
    try {
      await warehousesApi.create(token, {
        name,
        address: address || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      });
      setName("");
      setAddress("");
      setCapacity("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add warehouse");
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const warehouse = warehouses.find((w) => w.id === id);
    const ok = await confirm({
      title: "Delete warehouse?",
      message: `Delete "${warehouse?.name ?? "this warehouse"}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await warehousesApi.remove(token, id);
    if (expandedId === id) setExpandedId(null);
    load();
  }

  if (loading) return <div className="dashboard-status">Loading warehouses...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <WarehouseIcon size={16} />
            </span>
            <h2>Warehouses</h2>
            <span className="fleet-count-badge">{warehouses.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
            <Plus size={14} /> Add Warehouse
          </button>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleAdd}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input
              type="number"
              min="0"
              placeholder="Capacity (optional)"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            <button type="submit">Save</button>
          </form>
        )}

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Address</th>
              <th>Capacity</th>
              <th>Parcels Stored</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <Fragment key={w.id}>
                <tr className="warehouse-row-clickable" onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                  <td>
                    <button type="button" className="icon-button">
                      {expandedId === w.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </td>
                  <td>{w.name}</td>
                  <td className="fleet-muted">{w.address || "—"}</td>
                  <td className="fleet-muted">{w.capacity ?? "—"}</td>
                  <td>
                    <span className="fleet-count-badge">{w.parcel_count}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(w.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
                {expandedId === w.id && (
                  <StoredParcelsPanel warehouse={w} parcels={parcels} clients={clients} onChanged={load} />
                )}
              </Fragment>
            ))}
            {warehouses.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No warehouses yet.
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
