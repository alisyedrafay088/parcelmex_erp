import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CheckCircle2, MapPinCheck, Search, ShieldAlert, ShieldQuestion } from "lucide-react";
import { portalApi, type PortalParcel } from "../../api/portal";
import type { AddressVerificationStatus } from "../../api/parcels";
import { geocodeAddress, type GeoPoint } from "../../utils/geocode";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_MAP_CENTER: [number, number] = [24.8607, 67.0011];

const PIN_ICON = L.divIcon({
  className: "rider-map-dest-marker",
  html: "<span></span>",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

const STATUS_LABELS: Record<AddressVerificationStatus, string> = {
  unverified: "Unverified",
  verified: "Verified",
  needs_review: "Needs Review",
};

type Filter = "all" | AddressVerificationStatus;

export function PortalAddressVerification() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState<PortalParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addressDraft, setAddressDraft] = useState("");

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<GeoPoint | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!token) return;
    try {
      const p = await portalApi.listParcels(token);
      setParcels(p);
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

  const counts = useMemo(() => {
    const result = { all: parcels.length, unverified: 0, verified: 0, needs_review: 0 };
    for (const p of parcels) result[p.address_status]++;
    return result;
  }, [parcels]);

  const filteredParcels = useMemo(() => {
    let list = parcels;
    if (filter !== "all") list = list.filter((p) => p.address_status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.tracking_id.toLowerCase().includes(q) || p.destination_address?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [parcels, filter, search]);

  const selectedParcel = parcels.find((p) => p.id === selectedId) ?? null;

  function selectParcel(parcel: PortalParcel) {
    setSelectedId(parcel.id);
    setAddressDraft(parcel.destination_address ?? "");
    setCheckResult(undefined);
    setError(null);
  }

  // Automatically check the address whenever it changes -- either a different
  // parcel was selected, or the address was edited by hand (debounced).
  useEffect(() => {
    if (!selectedParcel) return;
    if (!addressDraft.trim()) {
      setCheckResult(undefined);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setCheckResult(undefined);
    const timer = setTimeout(() => {
      geocodeAddress(addressDraft)
        .then((result) => {
          if (!cancelled) setCheckResult(result);
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, addressDraft]);

  async function handleCheck() {
    if (!addressDraft.trim()) return;
    setChecking(true);
    setCheckResult(undefined);
    try {
      const result = await geocodeAddress(addressDraft);
      setCheckResult(result);
    } finally {
      setChecking(false);
    }
  }

  async function handleSetStatus(status: AddressVerificationStatus) {
    if (!token || !selectedParcel) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await portalApi.verifyAddress(token, selectedParcel.id, {
        status,
        lat: checkResult?.lat,
        lng: checkResult?.lng,
        destination_address: addressDraft,
      });
      setParcels((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update address status");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="dashboard-status">Loading parcels...</div>;

  return (
    <div className="dashboard">
      {error && <p className="login-error">{error}</p>}

      <section className="fleet-section">
        <div className="fleet-section-header">
          <div className="fleet-section-title">
            <span className="fleet-section-icon fleet-section-icon-blue">
              <MapPinCheck size={16} />
            </span>
            <h2>Address Verification</h2>
          </div>
        </div>

        <div className="airway-layout">
          <div className="airway-picker">
            <div className="av-filter-tabs">
              {(["all", "unverified", "verified", "needs_review"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`av-filter-tab ${filter === f ? "av-filter-tab-active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : STATUS_LABELS[f]} <span>{counts[f]}</span>
                </button>
              ))}
            </div>

            <div className="login-input-wrap airway-search-wrap">
              <Search size={16} />
              <input
                placeholder="Search by tracking ID or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="airway-parcel-list">
              {filteredParcels.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`airway-parcel-item ${selectedId === p.id ? "airway-parcel-item-selected" : ""}`}
                  onClick={() => selectParcel(p)}
                >
                  <span className="airway-parcel-item-title">
                    {p.tracking_id}
                    <span className={`av-status-dot av-status-dot-${p.address_status}`} />
                  </span>
                  <span className="airway-parcel-item-sub">{p.destination_address ?? "No address"}</span>
                </button>
              ))}
              {filteredParcels.length === 0 && <p className="empty-state">No parcels found.</p>}
            </div>
          </div>

          <div className="airway-form">
            {!selectedParcel && (
              <p className="empty-state">Select a parcel on the left to verify its delivery address.</p>
            )}

            {selectedParcel && (
              <>
                <div className="av-detail-header">
                  <div>
                    <strong>{selectedParcel.tracking_id}</strong>
                  </div>
                  <span className={`status-badge av-status-badge-${selectedParcel.address_status}`}>
                    {STATUS_LABELS[selectedParcel.address_status]}
                  </span>
                </div>

                <label htmlFor="pav-address" className="av-label">
                  Delivery Address
                </label>
                <textarea
                  id="pav-address"
                  className="av-address-textarea"
                  value={addressDraft}
                  onChange={(e) => {
                    setAddressDraft(e.target.value);
                    setCheckResult(undefined);
                  }}
                  rows={2}
                />

                <div className="av-action-row">
                  <button
                    type="button"
                    className="fleet-add-button fleet-add-button-secondary"
                    onClick={handleCheck}
                    disabled={checking}
                  >
                    <Search size={14} /> {checking ? "Checking..." : "Re-check Address"}
                  </button>
                </div>

                {checking && checkResult === undefined && (
                  <p className="av-check-result">
                    <Search size={14} /> Checking this address automatically...
                  </p>
                )}
                {!checking && checkResult === null && (
                  <p className="av-check-result av-check-result-fail">
                    <ShieldAlert size={14} /> Could not locate this address. Try adding more detail (area, city).
                  </p>
                )}
                {!checking && checkResult && (
                  <p className="av-check-result av-check-result-ok">
                    <CheckCircle2 size={14} /> Address found and located on the map below.
                  </p>
                )}

                <div className="live-map-wrap av-map-wrap">
                  <MapContainer
                    key={`${checkResult?.lat ?? selectedParcel.address_lat ?? "none"}-${checkResult?.lng ?? selectedParcel.address_lng ?? "none"}`}
                    center={
                      checkResult ??
                      (selectedParcel.address_lat && selectedParcel.address_lng
                        ? { lat: selectedParcel.address_lat, lng: selectedParcel.address_lng }
                        : DEFAULT_MAP_CENTER)
                    }
                    zoom={checkResult || selectedParcel.address_lat ? 14 : 6}
                    scrollWheelZoom
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {(checkResult ?? (selectedParcel.address_lat && selectedParcel.address_lng
                      ? { lat: selectedParcel.address_lat, lng: selectedParcel.address_lng }
                      : null)) && (
                      <Marker
                        position={
                          checkResult ?? [selectedParcel.address_lat as number, selectedParcel.address_lng as number]
                        }
                        icon={PIN_ICON}
                      >
                        <Popup>{addressDraft}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                <div className="av-status-buttons">
                  <button
                    type="button"
                    className="fleet-add-button av-verify-button"
                    onClick={() => handleSetStatus("verified")}
                    disabled={saving}
                  >
                    <CheckCircle2 size={14} /> Mark Verified
                  </button>
                  <button
                    type="button"
                    className="fleet-add-button fleet-add-button-secondary av-review-button"
                    onClick={() => handleSetStatus("needs_review")}
                    disabled={saving}
                  >
                    <ShieldQuestion size={14} /> Needs Review
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
