from pydantic import BaseModel

from app.models.client import ClientPlan, ClientStatus
from app.schemas.parcel import ParcelOut


class PortalClientOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    plan: ClientPlan
    status: ClientStatus

    class Config:
        from_attributes = True


class PortalSummary(BaseModel):
    total_parcels: int
    in_transit: int
    delivered: int
    pending: int


class BulkUploadResult(BaseModel):
    created: int
    errors: list[str]


class PortalParcelOut(ParcelOut):
    rider_name: str | None = None
    rider_phone: str | None = None


class PortalParcelUpdate(BaseModel):
    destination_address: str | None = None
    receiver_name: str | None = None
    receiver_phone: str | None = None
