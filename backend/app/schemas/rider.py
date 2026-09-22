from pydantic import BaseModel

from app.models.parcel import ParcelStatus
from app.models.rider import RiderStatus
from app.schemas.parcel import ParcelOut

RIDER_ALLOWED_STATUSES = (
    ParcelStatus.picked,
    ParcelStatus.packed,
    ParcelStatus.in_transit,
    ParcelStatus.delivered,
)


class RiderMeOut(BaseModel):
    id: int
    name: str
    phone: str | None
    status: RiderStatus

    class Config:
        from_attributes = True


class RiderStatusUpdate(BaseModel):
    status: RiderStatus


class RiderLocationUpdate(BaseModel):
    lat: float
    lng: float


class RiderParcelStatusUpdate(BaseModel):
    status: ParcelStatus


class RiderParcelOut(ParcelOut):
    client_name: str
