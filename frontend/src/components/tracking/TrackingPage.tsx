import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Logo } from "../Logo";
import { ParcelTracker } from "../portal/ParcelTracker";
import type { ParcelStatus } from "../../api/parcels";

export interface TrackableParcel {
  tracking_id: string;
  status: ParcelStatus;
  destination_address: string | null;
  description?: string | null;
  weight_kg: number;
  amount?: number;
  created_at: string;
  delivered_at: string | null;
  estimated_delivery_at: string | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  client_name?: string;
}

interface Props<T extends TrackableParcel> {
  onSearch: (trackingId: string) => Promise<T>;
}

function formatPkr(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function TrackingPage<T extends TrackableParcel>({ onSearch }: Props<T>) {
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") ?? "");
  const [parcel, setParcel] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function runSearch(id: string) {
    if (!id.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await onSearch(id.trim());
      setParcel(result);
    } catch (err) {
      setParcel(null);
      setError(err instanceof Error ? err.message : "Failed to track parcel");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) runSearch(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    await runSearch(trackingId);
  }

  return (
    <div className="tracking-page">
      <div className="tracking-hero">
        <Logo size="md" />
        <h1 className="tracking-hero-title">Track Your Parcel</h1>
        <p className="tracking-hero-subtitle">
          Enter your tracking ID below to see live status and delivery progress.
        </p>
        <form className="tracking-hero-form" onSubmit={handleSearch}>
          <div className="tracking-hero-input-wrap">
            <Search size={17} />
            <input
              type="text"
              placeholder="e.g. PM-000026"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="tracking-hero-button" disabled={searching || !trackingId.trim()}>
            {searching ? "Tracking..." : "Track"}
          </button>
        </form>
      </div>

      {error && <p className="login-error tracking-hero-error">{error}</p>}

      {parcel && (
        <div className="portal-parcel-card tracking-result-card">
          <div className="portal-parcel-top">
            <div className="portal-parcel-main">
              <span className="portal-parcel-tracking">{parcel.tracking_id}</span>
              <span className="portal-parcel-meta">
                {parcel.client_name ? `${parcel.client_name} · ` : ""}
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
            </div>
            <div className="portal-parcel-side">
              <span className={`status-badge parcel-status-${parcel.status}`}>
                {parcel.status.replace("_", " ")}
              </span>
              {parcel.amount !== undefined && (
                <span className={parcel.amount > 0 ? "portal-parcel-amount" : "portal-parcel-amount-pending"}>
                  {parcel.amount > 0 ? formatPkr(parcel.amount) : "Pricing pending"}
                </span>
              )}
            </div>
          </div>
          <ParcelTracker status={parcel.status} riderName={parcel.rider_name} riderPhone={parcel.rider_phone} />
        </div>
      )}
    </div>
  );
}
