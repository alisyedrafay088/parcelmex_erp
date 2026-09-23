import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { usersApi, type StaffUser, type UserRole } from "../api/users";
import { permissionsApi, type PermissionMatrix } from "../api/permissions";
import { FEATURES } from "../config/features";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

const ROLES: UserRole[] = ["owner", "support", "dispatch", "finance"];

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Roles() {
  const { token, user } = useAuth();
  const confirm = useConfirm();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("support");

  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSaving, setResetSaving] = useState(false);

  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [permRoles, setPermRoles] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(true);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [permSaved, setPermSaved] = useState(false);

  async function loadPermissions() {
    if (!token) return;
    try {
      const data = await permissionsApi.getMatrix(token);
      setMatrix(data.matrix);
      setPermRoles(data.roles);
    } catch (err) {
      setPermError(err instanceof Error ? err.message : "Failed to load permissions");
    } finally {
      setPermLoading(false);
    }
  }

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleFeature(roleKey: string, featureKey: string) {
    setPermSaved(false);
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [featureKey]: !prev[roleKey]?.[featureKey] },
    }));
  }

  async function savePermissions() {
    if (!token) return;
    setPermSaving(true);
    setPermError(null);
    try {
      const data = await permissionsApi.updateMatrix(token, matrix);
      setMatrix(data.matrix);
      setPermSaved(true);
    } catch (err) {
      setPermError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setPermSaving(false);
    }
  }

  async function load() {
    if (!token) return;
    try {
      const data = await usersApi.list(token);
      setStaff(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await usersApi.create(token, { name, username, email, password, role });
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("support");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff member");
    }
  }

  async function handleRoleChange(id: number, newRole: UserRole) {
    if (!token) return;
    await usersApi.updateRole(token, id, newRole);
    load();
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!token || !resetTarget) return;
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    setResetSaving(true);
    setResetError(null);
    try {
      await usersApi.resetPassword(token, resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setResetSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const member = staff.find((s) => s.id === id);
    const ok = await confirm({
      title: "Remove staff member?",
      message: `Remove "${member?.name ?? "this staff member"}"? They will lose access immediately.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await usersApi.remove(token, id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove staff member");
    }
  }

  if (loading) return <div className="dashboard-status">Loading staff...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}
      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-orange">
              <ShieldCheck size={16} />
            </span>
            <h2>Staff & Roles</h2>
            <span className="fleet-count-badge">{staff.length}</span>
          </div>
          <button type="button" className="fleet-add-button" onClick={() => setShowForm((s) => !s)}>
            <Plus size={14} /> Add Staff
          </button>
        </div>

        {showForm && (
          <form className="fleet-inline-form" onSubmit={handleAdd}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
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
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="fleet-name-cell">
                    <span className="fleet-avatar">{initialsFor(member.name)}</span>
                    {member.name}
                  </div>
                </td>
                <td className="fleet-muted">{member.username}</td>
                <td className="fleet-muted">{member.email}</td>
                <td>
                  <select
                    className="pill-select plain-select"
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                    disabled={member.id === user?.id}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setResetTarget(member);
                        setNewPassword("");
                        setResetError(null);
                      }}
                      title="Reset password"
                    >
                      <KeyRound size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(member.id)}
                      disabled={member.id === user?.id}
                      title={member.id === user?.id ? "You cannot remove your own account" : "Remove"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No staff members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-orange">
              <ShieldCheck size={16} />
            </span>
            <h2>Feature Access by Role</h2>
          </div>
          <button
            type="button"
            className="fleet-add-button"
            onClick={savePermissions}
            disabled={permSaving || permLoading}
          >
            {permSaving ? "Saving..." : permSaved ? "Saved" : "Save Permissions"}
          </button>
        </div>
        <p className="fleet-muted" style={{ margin: "0 0 12px" }}>
          Choose which sidebar features each role can see and use. Owner always has full access.
        </p>
        {permError && <p className="login-error">{permError}</p>}
        {permLoading ? (
          <div className="dashboard-status">Loading permissions...</div>
        ) : (
          <div className="table-scroll">
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {permRoles.map((r) => (
                    <th key={r}>{roleLabel(r)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr key={feature.key}>
                    <td>{feature.label}</td>
                    {permRoles.map((r) => (
                      <td key={r}>
                        <input
                          type="checkbox"
                          checked={Boolean(matrix[r]?.[feature.key])}
                          onChange={() => toggleFeature(r, feature.key)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resetTarget && (
        <div className="confirm-overlay" onMouseDown={() => setResetTarget(null)}>
          <div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-icon">
              <KeyRound size={18} />
            </div>
            <h3 className="confirm-dialog-title">Reset password</h3>
            <p className="confirm-dialog-message">
              Set a new password for <strong>{resetTarget.name}</strong> ({resetTarget.username}).
            </p>
            <form onSubmit={handleResetPassword}>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                required
                style={{ width: "100%", marginBottom: "1rem" }}
              />
              {resetError && <p className="login-error">{resetError}</p>}
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="confirm-btn confirm-btn-cancel"
                  onClick={() => setResetTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="confirm-btn confirm-btn-primary" disabled={resetSaving}>
                  {resetSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
