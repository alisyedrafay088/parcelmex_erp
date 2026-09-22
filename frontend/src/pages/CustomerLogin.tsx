import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export function CustomerLogin() {
  const { login, logout, token, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && token && user?.role === "client") return <Navigate to="/portal" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(username, password);
      if (loggedInUser.role !== "client") {
        logout();
        setError("This isn't a customer account. Please use the admin or rider login instead.");
        return;
      }
      navigate("/portal", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="portal-login-page">
      <form className="portal-login-card" onSubmit={handleSubmit}>
        <Logo size="md" />
        <h2 className="portal-login-heading">Track your parcels</h2>
        <p className="portal-login-subtitle">Sign in to see your shipments and invoices.</p>

        <label htmlFor="username">Username</label>
        <div className="login-input-wrap portal-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
          </svg>
          <input
            id="username"
            type="text"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </div>

        <label htmlFor="password">Password</label>
        <div className="login-input-wrap portal-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="portal-submit-button" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <div className="login-portal-row portal-back-row">
          <Link className="login-portal-button" to="/login">
            Admin
          </Link>
          <Link className="login-portal-button" to="/rider/login">
            Rider
          </Link>
        </div>
      </form>
    </div>
  );
}
