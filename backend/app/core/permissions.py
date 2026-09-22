from app.models.user import UserRole

# Every togglable module in the admin sidebar. "Dashboard" and "Roles" are
# intentionally excluded: dashboard is always visible to any staff member,
# and only an owner can ever manage staff/roles.
FEATURES: list[str] = [
    "parcels",
    "airway_bill",
    "address_verification",
    "tracking",
    "clients",
    "expenses",
    "fleet",
    "warehouses",
    "supplies",
    "invoicing",
    "reports",
]

# Roles whose feature access an owner can configure from the Staff & Roles page.
# Owner always has full access and is never restricted.
CONFIGURABLE_ROLES: list[UserRole] = [UserRole.support, UserRole.dispatch, UserRole.finance]

# Seeded the first time each (role, feature) pair is missing from the database,
# so upgrading the app doesn't silently lock existing staff out of everything.
# An owner can freely change these afterwards from the UI.
DEFAULT_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.support: {"parcels", "airway_bill", "address_verification", "tracking", "clients"},
    UserRole.dispatch: {"parcels", "airway_bill", "tracking", "fleet", "warehouses", "supplies"},
    UserRole.finance: {"expenses", "invoicing", "reports", "clients"},
}
