import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "../Logo";
import { useAuth } from "../../context/AuthContext";

export function RiderLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="rider-shell">
      <header className="rider-topbar">
        <Logo size="sm" />
        <div className="rider-topbar-info">
          <span className="rider-topbar-name">{user?.name}</span>
          <span className="rider-topbar-role">Rider</span>
        </div>
        <button type="button" className="icon-button" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </header>
      <div className="rider-content">
        <Outlet />
      </div>
    </div>
  );
}
