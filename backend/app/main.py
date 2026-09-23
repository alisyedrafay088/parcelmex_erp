from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine, sync_schema
from app.core.permissions import DEFAULT_PERMISSIONS
from app import models  # noqa: F401 -- ensures models are registered before create_all
from app.models.permission import RolePermission
from app.routers import (
    auth,
    clients,
    dashboard,
    expenses,
    fleet,
    invoices,
    parcels,
    permissions,
    portal,
    public,
    reports,
    rider,
    search,
    supplies,
    users,
    warehouses,
)

app = FastAPI(title="ZUHA Express API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list({"http://localhost:5173", settings.frontend_url}),
    allow_origin_regex=r"http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _seed_default_permissions() -> None:
    """Fill in any (role, feature) pair that isn't in the table yet, without ever
    overwriting a permission an owner already configured from the Staff & Roles UI."""
    db = SessionLocal()
    try:
        existing = {(row.role, row.feature) for row in db.query(RolePermission).all()}
        for role, features in DEFAULT_PERMISSIONS.items():
            for feature in features:
                if (role, feature) not in existing:
                    db.add(RolePermission(role=role, feature=feature, enabled=True))
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    sync_schema()
    _seed_default_permissions()


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(fleet.router)
app.include_router(parcels.router)
app.include_router(permissions.router)
app.include_router(clients.router)
app.include_router(invoices.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(portal.router)
app.include_router(warehouses.router)
app.include_router(supplies.router)
app.include_router(search.router)
app.include_router(rider.router)
app.include_router(public.router)
app.include_router(expenses.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "ZUHA Express API"}
