import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { ShieldCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "../Logo";

export interface SidebarModule {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
}

interface SidebarProps {
  modules: SidebarModule[];
  collapsed: boolean;
  onToggle: () => void;
  footerText?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  modules,
  collapsed,
  onToggle,
  footerText = "Role-based access enabled",
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  function handleHeaderToggle() {
    if (mobileOpen) {
      onMobileClose?.();
    } else {
      onToggle();
    }
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-header">
          {!collapsed && <Logo size="sm" />}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={handleHeaderToggle}
            title={mobileOpen ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {modules.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
                  }
                >
                  <item.icon size={16} />
                  {!collapsed && item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer" title={collapsed ? footerText : undefined}>
          <ShieldCheck size={14} />
          {!collapsed && <span>{footerText}</span>}
        </div>
      </aside>
    </>
  );
}
