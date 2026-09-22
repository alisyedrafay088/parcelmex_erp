import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Plus, Trash2, Truck, Users } from "lucide-react";
import { fleetApi, type Rider, type RiderStatus, type Vehicle, type VehicleStatus } from "../api/fleet";
import { usersApi, type StaffUser } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

const RIDER_STATUSES: RiderStatus[] = ["active", "idle", "offline"];
const VEHICLE_STATUSES: VehicleStatus[] = ["active", "idle", "maintenance"];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Fleet() {
  const { token, user } = useAuth();
  const confirm = useConfirm();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [riderLogins, setRiderLogins] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRiderForm, setShowRiderForm] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleRiderId, setVehicleRiderId] = useState<string>("");

  const [loginFormFor, setLoginFormFor] = useState<number | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  async function loadAll() {
    if (!token) return;
    try {
      const [r, v] = await Promise.all([fleetApi.listRiders(token), fleetApi.listVehicles(token)]);
      setRiders(r);
      setVehicles(v);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fleet data");
      setLoading(false);
    }
    if (user?.role === "owner") {
      try {
        setRiderLogins(await usersApi.list(token));
      } catch {
        // non-critical: login status just won't show
      }
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAddRider(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    await fleetApi.createRider(token, { name: riderName, phone: riderPhone || undefined, status: "offline" });
    setRiderName("");
    setRiderPhone("");
    setShowRiderForm(false);
    loadAll();
  }

  async function handleRiderStatusChange(id: number, status: RiderStatus) {
    if (!token) return;
    await fleetApi.updateRider(token, id, { status });
    loadAll();
  }

  async function handleDeleteRider(id: number) {
    if (!token) return;
    const rider = riders.find((r) => r.id === id);
    const ok = await confirm({
      title: "Remove rider?",
      message: `Remove "${rider?.name ?? "this rider"}" from the fleet? This cannot be undone.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    await fleetApi.deleteRider(token, id);
    loadAll();
  }

  async function handleCreateRiderLogin(e: FormEvent, riderId: number) {
    e.preventDefault();
    if (!token) return;
    try {
      await fleetApi.createRiderPortalAccount(token, riderId, {
        username: loginUsername,
        password: loginPassword,
      });
      setLoginFormFor(null);
      setLoginUsername("");
      setLoginPassword("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rider login");
    }
  }

  async function handleAddVehicle(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    await fleetApi.createVehicle(token, {
      plate_number: plateNumber,
      type: vehicleType,
      status: "idle",
      rider_id: vehicleRiderId ? Number(vehicleRiderId) : null,
    });
    setPlateNumber("");
    setVehicleType("");
    setVehicleRiderId("");
    setShowVehicleForm(false);
    loadAll();
  }

  async function handleVehicleStatusChange(id: number, status: VehicleStatus) {
    if (!token) return;
    await fleetApi.updateVehicle(token, id, { status });
    loadAll();
  }

  async function handleVehicleRiderChange(id: number, riderId: string) {
    if (!token) return;
    await fleetApi.updateVehicle(token, id, { rider_id: riderId ? Number(riderId) : null });
    loadAll();
  }

  async function handleDeleteVehicle(id: number) {
    if (!token) return;
    const vehicle = vehicles.find((v) => v.id === id);
    const ok = await confirm({
      title: "Remove vehicle?",
      message: `Remove "${vehicle?.plate_number ?? "this vehicle"}" from the fleet? This cannot be undone.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    await fleetApi.deleteVehicle(token, id);
    loadAll();
  }

  if (loading) return <div className="dashboard-status">Loading fleet...</div>;
  if (error) return <div className="dashboard-status error">Error: {error}</div>;

  return (
    <div className="dashboard">
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <Users size={16} />
            </span>
            <h2>Riders</h2>
            <span className="fleet-count-badge">{riders.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowRiderForm((s) => !s)}>
            <Plus size={14} /> Add Rider
          </button>
        </div>

        {showRiderForm && (
          <form className="fleet-inline-form" onSubmit={handleAddRider}>
            <input placeholder="Name" value={riderName} onChange={(e) => setRiderName(e.target.value)} required />
            <input placeholder="Phone (optional)" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} />
            <button type="submit">Save</button>
          </form>
        )}

        <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => {
              const login = riderLogins.find((u) => u.role === "rider" && u.rider_id === rider.id);
              return (
                <tr key={rider.id}>
                  <td>
                    <div className="fleet-name-cell">
                      <span className="fleet-avatar">{initialsFor(rider.name)}</span>
                      {rider.name}
                    </div>
                  </td>
                  <td className="fleet-muted">{rider.phone || "—"}</td>
                  <td>
                    <select
                      className={`pill-select status-${rider.status}`}
                      value={rider.status}
                      onChange={(e) => handleRiderStatusChange(rider.id, e.target.value as RiderStatus)}
                    >
                      {RIDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {login ? (
                      <span className="pill-select status-active" style={{ cursor: "default" }}>
                        {login.username}
                      </span>
                    ) : user?.role === "owner" ? (
                      <button
                        type="button"
                        className="fleet-add-button fleet-add-button-sm"
                        onClick={() => setLoginFormFor(rider.id)}
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
                      onClick={() => handleDeleteRider(rider.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {riders.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No riders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {loginFormFor !== null && (
          <form
            className="fleet-inline-form"
            style={{ marginTop: "1rem" }}
            onSubmit={(e) => handleCreateRiderLogin(e, loginFormFor)}
          >
            <span className="fleet-muted">
              Rider login for <strong>{riders.find((r) => r.id === loginFormFor)?.name}</strong>:
            </span>
            <input
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button type="submit">Create</button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setLoginFormFor(null)}
              title="Cancel"
            >
              ✕
            </button>
          </form>
        )}
      </section>

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-orange">
              <Truck size={16} />
            </span>
            <h2>Vehicles</h2>
            <span className="fleet-count-badge">{vehicles.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowVehicleForm((s) => !s)}>
            <Plus size={14} /> Add Vehicle
          </button>
        </div>

        {showVehicleForm && (
          <form className="fleet-inline-form" onSubmit={handleAddVehicle}>
            <input
              placeholder="Plate Number"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              required
            />
            <input placeholder="Type (e.g. Bike, Van)" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} required />
            <select
              value={vehicleRiderId}
              onChange={(e) => setVehicleRiderId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
              <th>Plate Number</th>
              <th>Type</th>
              <th>Status</th>
              <th>Assigned Rider</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td>
                  <span className="plate-badge">{vehicle.plate_number}</span>
                </td>
                <td className="fleet-muted">{vehicle.type}</td>
                <td>
                  <select
                    className={`pill-select status-${vehicle.status}`}
                    value={vehicle.status}
                    onChange={(e) => handleVehicleStatusChange(vehicle.id, e.target.value as VehicleStatus)}
                  >
                    {VEHICLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="pill-select plain-select"
                    value={vehicle.rider_id ?? ""}
                    onChange={(e) => handleVehicleRiderChange(vehicle.id, e.target.value)}
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
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No vehicles yet.
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
