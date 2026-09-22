import { parcelsApi } from "../api/parcels";
import { useAuth } from "../context/AuthContext";
import { TrackingPage } from "../components/tracking/TrackingPage";

export function Tracking() {
  const { token } = useAuth();

  async function handleSearch(trackingId: string) {
    if (!token) throw new Error("Not authenticated");
    return parcelsApi.track(token, trackingId);
  }

  return <TrackingPage onSearch={handleSearch} />;
}
