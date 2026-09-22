import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Boxes, Plus, Trash2 } from "lucide-react";
import { suppliesApi, type Supply } from "../api/supplies";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

function QuantityCell({ supply, onSave }: { supply: Supply; onSave: (quantity: number) => void }) {
  const [value, setValue] = useState(String(supply.quantity));

  useEffect(() => {
    setValue(String(supply.quantity));
  }, [supply.quantity]);

  function commit() {
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 0 && num !== supply.quantity) {
      onSave(num);
    } else {
      setValue(String(supply.quantity));
    }
  }

  return (
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="quantity-input"
    />
  );
}

export function Supplies() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("");

  async function load() {
    if (!token) return;
    try {
      const list = await suppliesApi.list(token);
      setSupplies(list);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplies");
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
      await suppliesApi.create(token, {
        name,
        unit: unit || "pcs",
        quantity: Number(quantity) || 0,
        reorder_level: reorderLevel ? Number(reorderLevel) : undefined,
      });
      setName("");
      setUnit("pcs");
      setQuantity("0");
      setReorderLevel("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add supply");
    }
  }

  async function handleQuantityChange(id: number, quantity: number) {
    if (!token) return;
    await suppliesApi.update(token, id, { quantity });
    load();
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const supply = supplies.find((s) => s.id === id);
    const ok = await confirm({
      title: "Delete supply?",
      message: `Delete "${supply?.name ?? "this supply"}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await suppliesApi.remove(token, id);
    load();
  }

  if (loading) return <div className="dashboard-status">Loading supplies...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Boxes size={16} />
            </span>
            <h2>Packaging Supplies</h2>
            <span className="fleet-count-badge">{supplies.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
            <Plus size={14} /> Add Supply
          </button>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleAdd}>
            <input placeholder="Name (e.g. Small Box)" value={name} onChange={(e) => setName(e.target.value)} required />
            <input placeholder="Unit (e.g. pcs, rolls)" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <input
              type="number"
              min="0"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Low-stock alert at (optional)"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
            />
            <button type="submit">Save</button>
          </form>
        )}

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Low-stock Alert</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {supplies.map((s) => {
              const isLow = s.reorder_level !== null && s.quantity <= s.reorder_level;
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="fleet-muted">{s.unit}</td>
                  <td>
                    <QuantityCell supply={s} onSave={(q) => handleQuantityChange(s.id, q)} />
                  </td>
                  <td className="fleet-muted">{s.reorder_level ?? "—"}</td>
                  <td>
                    {isLow && (
                      <span className="supply-low-badge">
                        <AlertTriangle size={12} /> Low stock
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {supplies.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No supplies added yet.
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
