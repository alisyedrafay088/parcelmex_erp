import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

const FEATURES = [
  "Parcels, riders and routes, live",
  "Fleet, warehouse and full billing",
  "AI-powered ETAs and forecasting",
];

export function Login() {
  const { login, token, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && token) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <Logo size="lg" withTagline />

        <span className="login-tag">ADMIN PANEL</span>

        <h1 className="login-headline">
          Run every parcel, rider and rupee from one place.
        </h1>
        <p className="login-tagline">
          The complete back office for Parcel Mex — dispatch, fleet, billing
          and everything in between.
        </p>

        <ul className="login-features">
          {FEATURES.map((feature) => (
            <li key={feature}>
              <span className="login-feature-dot" />
              {feature}
            </li>
          ))}
        </ul>

        <p className="login-footnote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z" />
          </svg>
          Secured with role-based access control
        </p>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to your account to continue.</p>

          <label htmlFor="username">Username</label>
          <div className="login-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            <input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="login-input-wrap">
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

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="login-divider">
            <span className="line" />
            <span>Or</span>
            <span className="line" />
          </div>

          <p className="login-portal-hint">Are you a customer or rider?</p>
          <div className="login-portal-row">
            <Link className="login-portal-button" to="/customer/login">
              Customer Portal
            </Link>
            <Link className="login-portal-button" to="/rider/login">
              Rider Portal
            </Link>
          </div>

          <Link className="login-track-link" to="/track">
            Just want to track a parcel?
          </Link>

          <p className="login-built-by">
            Built by <strong>Syed Rafay Ali</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
