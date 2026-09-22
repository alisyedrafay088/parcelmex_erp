import { useEffect, useState, type FormEvent } from "react";
import { Building2, CheckCircle2, KeyRound, Plus, Trash2, XCircle } from "lucide-react";
import { clientsApi, type Client, type ClientPlan, type ClientStatus } from "../api/clients";
import { usersApi, type StaffUser } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { ClientPlanDonut } from "../components/clients/ClientPlanDonut";

const PLANS: ClientPlan[] = ["basic", "standard", "premium"];
const STATUSES: ClientStatus[] = ["active", "inactive"];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Clients() {
  const { token, user } = useAuth();
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [portalUsers, setPortalUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<ClientPlan>("basic");

  const [portalFormFor, setPortalFormFor] = useState<number | null>(null);
  const [portalUsername, setPortalUsername] = useState("");
  const [portalPassword, setPortalPassword] = useState("");

  async function load() {
    if (!token) return;
    try {
      const data = await clientsApi.list(token);
      setClients(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
      setLoading(false);
    }
    if (user?.role === "owner") {
      try {
        setPortalUsers(await usersApi.list(token));
      } catch {
        // non-critical: portal-login status just won't show
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    await clientsApi.create(token, { name, email, phone: phone || undefined, plan });
    setName("");
    setEmail("");
    setPhone("");
    setPlan("basic");
    setShowForm(false);
    load();
  }

  async function handlePlanChange(id: number, newPlan: ClientPlan) {
    if (!token) return;
    await clientsApi.update(token, id, { plan: newPlan });
    load();
  }

  async function handleStatusChange(id: number, status: ClientStatus) {
    if (!token) return;
    await clientsApi.update(token, id, { status });
    load();
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const client = clients.find((c) => c.id === id);
    const ok = await confirm({
      title: "Delete client?",
      message: `Delete "${client?.name ?? "this client"}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await clientsApi.remove(token, id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
    }
  }

  async function handleCreatePortalAccount(e: FormEvent, clientId: number) {
    e.preventDefault();
    if (!token) return;
    try {
      await clientsApi.createPortalAccount(token, clientId, {
        username: portalUsername,
        password: portalPassword,
      });
      setPortalFormFor(null);
      setPortalUsername("");
      setPortalPassword("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create portal login");
    }
  }

  if (loading) return <div className="dashboard-status">Loading clients...</div>;

  const activeCount = clients.filter((c) => c.status === "active").length;
  const inactiveCount = clients.length - activeCount;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}

      <div className="card-grid">
        <div className="card">
          <div className="card-icon card-icon-blue">
            <Building2 size={20} />
          </div>
          <div>
            <div className="card-value">{clients.length}</div>
            <div className="card-label">Total Clients</div>
          </div>
        </div>
        <div className="card">
          <div className="card-icon card-icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="card-value">{activeCount}</div>
            <div className="card-label">Active</div>
          </div>
        </div>
        <div className="card">
          <div className="card-icon card-icon-red">
            <XCircle size={20} />
          </div>
          <div>
            <div className="card-value">{inactiveCount}</div>
            <div className="card-label">Inactive</div>
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <ClientPlanDonut clients={clients} />
      </div>

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Building2 size={16} />
            </span>
            <h2>Clients</h2>
            <span className="fleet-count-badge">{clients.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
            <Plus size={14} /> Add Client
          </button>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleAdd}>
            <input placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as ClientPlan)}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button type="submit">Save</button>
          </form>
        )}

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Portal Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const portalUser = portalUsers.find(
                (u) => u.role === "client" && u.client_id === client.id,
              );
              return (
                <tr key={client.id}>
                  <td>
                    <div className="fleet-name-cell">
                      <span className="fleet-avatar">{initialsFor(client.name)}</span>
                      {client.name}
                    </div>
                  </td>
                  <td className="fleet-muted">{client.email}</td>
                  <td className="fleet-muted">{client.phone || "—"}</td>
                  <td>
                    <select
                      className={`pill-select plan-${client.plan}`}
                      value={client.plan}
                      onChange={(e) => handlePlanChange(client.id, e.target.value as ClientPlan)}
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={`pill-select status-${client.status === "active" ? "active" : "offline"}`}
                      value={client.status}
                      onChange={(e) => handleStatusChange(client.id, e.target.value as ClientStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {portalUser ? (
                      <span className="pill-select status-active" style={{ cursor: "default" }}>
                        {portalUser.username}
                      </span>
                    ) : user?.role === "owner" ? (
                      <button
                        type="button"
                        className="fleet-add-button fleet-add-button-sm"
                        onClick={() => setPortalFormFor(client.id)}
                      >
                        <KeyRound size={13} /> Create Login
                      </button>
                    ) : (
                      <span className="fleet-muted">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {portalFormFor !== null && (
          <form
            className="fleet-inline-form"
            style={{ marginTop: "1rem" }}
            onSubmit={(e) => handleCreatePortalAccount(e, portalFormFor)}
          >
            <span className="fleet-muted">
              Portal login for{" "}
              <strong>{clients.find((c) => c.id === portalFormFor)?.name}</strong>:
            </span>
            <input
              placeholder="Username"
              value={portalUsername}
              onChange={(e) => setPortalUsername(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
              required
            />
            <button type="submit">Create</button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setPortalFormFor(null)}
              title="Cancel"
            >
              ✕
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
