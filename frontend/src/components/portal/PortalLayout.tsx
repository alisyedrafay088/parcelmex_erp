import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LogOut, Package, FileText, Truck, Search, Printer, MapPinCheck } from "lucide-react";
import { Sidebar, type SidebarModule } from "../layout/Sidebar";
import { ChatWidget } from "./ChatWidget";
import { useAuth } from "../../context/AuthContext";

const PORTAL_MODULES: SidebarModule[] = [
  { to: "/portal", label: "My Parcels", icon: Package, end: true },
  { to: "/portal/airway-bill", label: "Airway Bill", icon: Printer },
  { to: "/portal/address-verification", label: "Address Verification", icon: MapPinCheck },
  { to: "/portal/tracking", label: "Tracking", icon: Search },
  { to: "/portal/fleet", label: "Fleet", icon: Truck },
  { to: "/portal/invoices", label: "My Invoices", icon: FileText },
];

const PAGE_TITLES: Record<string, string> = {
  "/portal": "My Parcels",
  "/portal/airway-bill": "Airway Bill",
  "/portal/address-verification": "Address Verification",
  "/portal/tracking": "Tracking",
  "/portal/fleet": "Fleet",
  "/portal/invoices": "My Invoices",
};

function initialsFor(name: string | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function PortalLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] ?? "";

  return (
    <div className="app-shell">
      <Sidebar
        modules={PORTAL_MODULES}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        footerText="Secure customer access"
      />
      <div className="app-main">
        <header className="app-topbar">
          <h1 className="app-topbar-title">{title}</h1>
          <div className="app-topbar-actions">
            <div className="app-avatar">
              <span className="app-avatar-circle">{initialsFor(user?.name)}</span>
              <div className="app-avatar-info">
                <span className="app-avatar-name">{user?.name}</span>
                <span className="app-avatar-role">Customer</span>
              </div>
            </div>
            <button type="button" className="icon-button" onClick={logout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
