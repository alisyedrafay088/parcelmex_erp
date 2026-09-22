// Single source of truth for the admin sidebar's togglable modules. Keys here must
// match the feature strings the backend uses in app/core/permissions.py.

export interface FeatureDef {
  key: string;
  label: string;
}

export const FEATURES: FeatureDef[] = [
  { key: "parcels", label: "Parcels" },
  { key: "airway_bill", label: "Airway Bill" },
  { key: "address_verification", label: "Address Verification" },
  { key: "tracking", label: "Tracking" },
  { key: "clients", label: "Client Management" },
  { key: "expenses", label: "Operating Expenses" },
  { key: "fleet", label: "Fleet Management" },
  { key: "warehouses", label: "Warehouses" },
  { key: "supplies", label: "Packaging Supplies" },
  { key: "invoicing", label: "Invoicing & Billing" },
  { key: "reports", label: "Reports" },
];

// Maps a sidebar route to the feature key that gates it. Routes not listed here
// (Dashboard, Roles) are always visible to any logged-in staff member / owner only.
export const ROUTE_FEATURE: Record<string, string> = {
  "/parcels": "parcels",
  "/airway-bill": "airway_bill",
  "/address-verification": "address_verification",
  "/tracking": "tracking",
  "/clients": "clients",
  "/expenses": "expenses",
  "/fleet": "fleet",
  "/warehouses": "warehouses",
  "/supplies": "supplies",
  "/invoicing": "invoicing",
  "/reports": "reports",
};

// Roles an owner can configure feature access for from the Staff & Roles page.
// Owner itself always has full access and is never restricted.
export const CONFIGURABLE_ROLES = ["support", "dispatch", "finance"] as const;
