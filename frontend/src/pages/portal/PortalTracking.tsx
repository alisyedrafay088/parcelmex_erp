import { portalApi } from "../../api/portal";
import { useAuth } from "../../context/AuthContext";
import { TrackingPage } from "../../components/tracking/TrackingPage";

export function PortalTracking() {
  const { token } = useAuth();

  async function handleSearch(trackingId: string) {
    if (!token) throw new Error("Not authenticated");
    return portalApi.trackParcel(token, trackingId);
  }

  return <TrackingPage onSearch={handleSearch} />;
}
