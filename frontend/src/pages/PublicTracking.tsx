import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import { TrackingPage } from "../components/tracking/TrackingPage";

export function PublicTracking() {
  return (
    <div className="public-tracking-page">
      <TrackingPage onSearch={publicApi.trackParcel} />
      <div className="public-tracking-footer">
        <Link to="/login">Admin login</Link>
        <span>·</span>
        <Link to="/customer/login">Customer login</Link>
        <span>·</span>
        <Link to="/rider/login">Rider login</Link>
      </div>
    </div>
  );
}
