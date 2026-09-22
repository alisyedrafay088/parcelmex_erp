import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Package, RefreshCw, Route as RouteIcon } from "lucide-react";
import { riderApi, type RiderMe, type RiderParcel } from "../../api/rider";
import type { RiderStatus } from "../../api/fleet";
import type { ParcelStatus } from "../../api/parcels";
import { useAuth } from "../../context/AuthContext";
import { ParcelTracker } from "../../components/portal/ParcelTracker";
import { geocodeAddress, type GeoPoint } from "../../utils/geocode";
import { optimizeRoute, type OptimizedRoute } from "../../utils/routeOptimize";

const DEFAULT_MAP_CENTER: [number, number] = [24.8607, 67.0011];

const SELF_ICON = L.divIcon({
  className: "rider-map-self-marker",
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const DESTINATION_ICON = L.divIcon({
  className: "rider-map-dest-marker",
  html: '<span></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

function numberedStopIcon(sequence: number) {
  return L.divIcon({
    className: "rider-map-numbered-marker-wrap",
    html: `<span class="rider-map-numbered-marker">${sequence}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

interface ParcelPin {
  id: number;
  tracking_id: string;
  status: ParcelStatus;
  destination_address: string;
  lat: number;
  lng: number;
}

const RIDER_STATUSES: RiderStatus[] = ["active", "idle", "offline"];

const STATUS_FLOW: ParcelStatus[] = ["pending", "picked", "packed", "in_transit", "delivered"];

function nextStatus(current: ParcelStatus): ParcelStatus | null {
  if (current === "delayed") return "delivered";
  if (current === "cancelled" || current === "delivered") return null;
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

const NEXT_LABEL: Partial<Record<ParcelStatus, string>> = {
  pending: "Mark as Picked",
  picked: "Mark as Packed",
  packed: "Mark as In Transit",
  in_transit: "Mark as Delivered",
  delayed: "Mark as Delivered",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function navigationUrl(pin: ParcelPin | undefined, fallbackAddress: string | null) {
  if (pin) return `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;
  if (fallbackAddress) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackAddress)}`;
  return null;
}

const LOCATION_INTERVAL_MS = 20000;

export function RiderDeliveries() {
  const { token } = useAuth();
  const [me, setMe] = useState<RiderMe | null>(null);
  const [parcels, setParcels] = useState<RiderParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [myPosition, setMyPosition] = useState<GeoPoint | null>(null);
  const [parcelPins, setParcelPins] = useState<ParcelPin[]>([]);
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  async function load() {
    if (!token) return;
    try {
      const [meData, parcelsData] = await Promise.all([riderApi.getMe(token), riderApi.listParcels(token)]);
      setMe(meData);
      setParcels(parcelsData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your deliveries");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !me || me.status === "offline" || !("geolocation" in navigator)) {
      setSharingLocation(false);
      return;
    }

    let cancelled = false;

    function sendLocation() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled || !token) return;
          setMyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          riderApi
            .updateMyLocation(token, pos.coords.latitude, pos.coords.longitude)
            .then(() => {
              if (!cancelled) {
                setSharingLocation(true);
                setLocationError(null);
              }
            })
            .catch(() => {
              if (!cancelled) setSharingLocation(false);
            });
        },
        () => {
          if (!cancelled) {
            setSharingLocation(false);
            setLocationError("Location access denied. Enable it to share your live position.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }

    sendLocation();
    const interval = setInterval(sendLocation, LOCATION_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, me?.status]);

  useEffect(() => {
    const activeParcels = parcels.filter((p) => p.status !== "delivered" && p.status !== "cancelled");
    let cancelled = false;

    async function run() {
      const pins: ParcelPin[] = [];
      for (const parcel of activeParcels) {
        if (!parcel.destination_address) continue;
        const geo = await geocodeAddress(parcel.destination_address);
        if (cancelled) return;
        if (geo) {
          pins.push({
            id: parcel.id,
            tracking_id: parcel.tracking_id,
            status: parcel.status,
            destination_address: parcel.destination_address,
            ...geo,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      if (!cancelled) setParcelPins(pins);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels.map((p) => `${p.id}:${p.status}:${p.destination_address ?? ""}`).join("|")]);

  useEffect(() => {
    if (!myPosition || parcelPins.length === 0) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    optimizeRoute(myPosition, parcelPins)
      .then((result) => {
        if (!cancelled) setRoute(result);
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPosition?.lat, myPosition?.lng, parcelPins.map((p) => p.id).join("|")]);

  async function handleMyStatusChange(status: RiderStatus) {
    if (!token) return;
    try {
      const updated = await riderApi.updateMyStatus(token, status);
      setMe(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update your status");
    }
  }

  async function handleAdvance(parcel: RiderParcel) {
    if (!token) return;
    const next = nextStatus(parcel.status);
    if (!next) return;
    setUpdatingId(parcel.id);
    try {
      await riderApi.updateParcelStatus(token, parcel.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update parcel status");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="dashboard-status">Loading your deliveries...</div>;

  const active = parcels.filter((p) => p.status !== "delivered" && p.status !== "cancelled");
  const done = parcels.filter((p) => p.status === "delivered" || p.status === "cancelled");

  const orderedPins = route ? route.order.map((idx) => parcelPins[idx]) : [];
  const stopSequenceByParcelId = new Map(orderedPins.map((pin, i) => [pin.id, i + 1]));
  const sortedActive = route
    ? [...active].sort((a, b) => {
        const seqA = stopSequenceByParcelId.get(a.id) ?? Infinity;
        const seqB = stopSequenceByParcelId.get(b.id) ?? Infinity;
        return seqA - seqB;
      })
    : active;

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return (
    <div className="rider-page">
      {error && <p className="login-error">{error}</p>}

      <div className="rider-status-row">
        <span className="rider-status-label">I'm currently:</span>
        <div className="rider-status-toggle">
          {RIDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`rider-status-pill rider-status-pill-${s} ${me?.status === s ? "rider-status-pill-selected" : ""}`}
              onClick={() => handleMyStatusChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button type="button" className="icon-button" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {me?.status !== "offline" && (
        <p className={`rider-location-status ${sharingLocation ? "rider-location-status-on" : ""}`}>
          <MapPin size={13} />
          {sharingLocation
            ? "Sharing your live location"
            : locationError ?? "Waiting for location access..."}
        </p>
      )}

      <h2 className="rider-section-title">
        <MapPin size={18} /> Delivery Map
      </h2>

      {route && route.order.length > 0 && (
        <div className="rider-route-summary">
          <RouteIcon size={16} />
          <span>
            Suggested route: <strong>{route.order.length}</strong> stop{route.order.length === 1 ? "" : "s"} ·{" "}
            <strong>{route.distanceKm.toFixed(1)} km</strong> · <strong>{formatDuration(route.durationMin)}</strong>
          </span>
          {route.provider === "fallback" && (
            <span className="rider-route-fallback-note">(straight-line estimate — road routing unavailable)</span>
          )}
        </div>
      )}
      {routeLoading && !route && <p className="rider-map-note">Calculating your best route...</p>}

      <div className="live-map-wrap rider-map-wrap">
        <MapContainer
          key={`${myPosition ? "me" : "no-me"}-${parcelPins.length}`}
          center={myPosition ?? (parcelPins[0] ? [parcelPins[0].lat, parcelPins[0].lng] : DEFAULT_MAP_CENTER)}
          zoom={12}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {route && route.geometry.length > 1 && (
            <Polyline positions={route.geometry} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.7 }} />
          )}
          {myPosition && (
            <Marker position={[myPosition.lat, myPosition.lng]} icon={SELF_ICON}>
              <Popup>You are here</Popup>
            </Marker>
          )}
          {parcelPins.map((pin) => {
            const sequence = stopSequenceByParcelId.get(pin.id);
            return (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={sequence ? numberedStopIcon(sequence) : DESTINATION_ICON}
              >
                <Popup>
                  {sequence && (
                    <>
                      <strong>Stop {sequence}</strong>
                      <br />
                    </>
                  )}
                  <strong>{pin.tracking_id}</strong>
                  <br />
                  {pin.destination_address}
                  <br />
                  Status: {pin.status.replace("_", " ")}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      {active.length === 0 && <p className="rider-map-note">No active deliveries to show on the map yet.</p>}
      {active.length > 0 && parcelPins.length < active.length && (
        <p className="rider-map-note">
          Locating {active.length - parcelPins.length} more address{active.length - parcelPins.length === 1 ? "" : "es"}...
        </p>
      )}
      {active.length > 0 && parcelPins.length > 0 && !myPosition && (
        <p className="rider-map-note">Turn on location sharing above to get your suggested route order.</p>
      )}

      <h2 className="rider-section-title">
        <Package size={18} /> My Deliveries <span className="fleet-count-badge">{active.length}</span>
      </h2>

      {active.length === 0 && <p className="empty-state">No active deliveries assigned to you right now.</p>}

      {sortedActive.map((parcel) => {
        const next = nextStatus(parcel.status);
        const label = NEXT_LABEL[parcel.status];
        const pin = parcelPins.find((p) => p.id === parcel.id);
        const navUrl = navigationUrl(pin, parcel.destination_address);
        const sequence = stopSequenceByParcelId.get(parcel.id);
        return (
          <div className="portal-parcel-card" key={parcel.id}>
            <div className="portal-parcel-top">
              <div className="portal-parcel-main">
                <span className="portal-parcel-tracking">
                  {sequence && <span className="rider-stop-badge">{sequence}</span>}
                  {parcel.tracking_id}
                </span>
                <span className="portal-parcel-meta">
                  {parcel.client_name} · {parcel.weight_kg} kg · Booked {formatDate(parcel.created_at)}
                </span>
                {parcel.destination_address && (
                  <span className="portal-parcel-meta">📍 {parcel.destination_address}</span>
                )}
                {parcel.description && <span className="portal-parcel-meta">{parcel.description}</span>}
              </div>
              <div className="portal-parcel-side">
                <span className={`status-badge parcel-status-${parcel.status}`}>
                  {parcel.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <ParcelTracker status={parcel.status} />
            {navUrl && (
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fleet-add-button fleet-add-button-secondary rider-navigate-button"
              >
                <Navigation size={14} /> Navigate
              </a>
            )}
            {next && label && (
              <button
                type="button"
                className="fleet-add-button rider-advance-button"
                onClick={() => handleAdvance(parcel)}
                disabled={updatingId === parcel.id}
              >
                {updatingId === parcel.id ? "Updating..." : label}
              </button>
            )}
          </div>
        );
      })}

      {done.length > 0 && (
        <>
          <h2 className="rider-section-title rider-section-title-muted">
            Completed <span className="fleet-count-badge">{done.length}</span>
          </h2>
          {done.map((parcel) => (
            <div className="portal-parcel-card" key={parcel.id}>
              <div className="portal-parcel-top">
                <div className="portal-parcel-main">
                  <span className="portal-parcel-tracking">{parcel.tracking_id}</span>
                  <span className="portal-parcel-meta">
                    {parcel.client_name} · {parcel.weight_kg} kg
                    {parcel.delivered_at ? ` · Delivered ${formatDate(parcel.delivered_at)}` : ""}
                  </span>
                </div>
                <div className="portal-parcel-side">
                  <span className={`status-badge parcel-status-${parcel.status}`}>
                    {parcel.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
