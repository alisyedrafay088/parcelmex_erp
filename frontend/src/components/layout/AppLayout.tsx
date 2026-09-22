import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  Boxes,
  Users,
  FileText,
  BarChart3,
  ShieldCheck,
  LogOut,
  Search,
  Printer,
  Wallet,
  MapPinCheck,
  Menu,
} from "lucide-react";
import { Sidebar, type SidebarModule } from "./Sidebar";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "../../context/AuthContext";
import { ROUTE_FEATURE } from "../../config/features";

const ADMIN_MODULES: SidebarModule[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/parcels", label: "Parcels", icon: Package },
  { to: "/airway-bill", label: "Airway Bill", icon: Printer },
  { to: "/address-verification", label: "Address Verification", icon: MapPinCheck },
  { to: "/tracking", label: "Tracking", icon: Search },
  { to: "/clients", label: "Client Management", icon: Users },
  { to: "/expenses", label: "Operating Expenses", icon: Wallet },
  { to: "/fleet", label: "Fleet Management", icon: Truck },
  { to: "/warehouses", label: "Warehouses", icon: Warehouse },
  { to: "/supplies", label: "Packaging Supplies", icon: Boxes },
  { to: "/invoicing", label: "Invoicing & Billing", icon: FileText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/roles", label: "Roles", icon: ShieldCheck },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/parcels": "Parcels",
  "/airway-bill": "Airway Bill",
  "/address-verification": "Address Verification",
  "/tracking": "Tracking",
  "/fleet": "Fleet Management",
  "/warehouses": "Warehouses",
  "/supplies": "Packaging Supplies",
  "/clients": "Client Management",
  "/invoicing": "Invoicing & Billing",
  "/expenses": "Operating Expenses",
  "/reports": "Reports",
  "/roles": "Roles",
};

function initialsFor(name: string | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout, hasFeature } = useAuth();
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] ?? "";
  const modules = ADMIN_MODULES.filter((m) => {
    if (m.to === "/roles") return user?.role === "owner";
    const feature = ROUTE_FEATURE[m.to];
    return !feature || hasFeature(feature);
  });

  return (
    <div className="app-shell">
      <Sidebar
        modules={modules}
        collapsed={mobileNavOpen ? false : collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileNavOpen(true)}
            title="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="app-topbar-title">{title}</h1>

          <GlobalSearch />

          <div className="app-topbar-actions">
            <div className="app-avatar">
              <span className="app-avatar-circle">{initialsFor(user?.name)}</span>
              <div className="app-avatar-info">
                <span className="app-avatar-name">{user?.name}</span>
                <span className="app-avatar-role">{user?.role}</span>
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
    </div>
  );
}
