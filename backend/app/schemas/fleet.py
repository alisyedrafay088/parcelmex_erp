from datetime import datetime

from pydantic import BaseModel

from app.models.rider import RiderStatus
from app.models.vehicle import VehicleStatus


class RiderCreate(BaseModel):
    name: str
    phone: str | None = None
    status: RiderStatus = RiderStatus.offline


class RiderAccountCreate(BaseModel):
    username: str
    password: str


class RiderUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    status: RiderStatus | None = None


class RiderOut(BaseModel):
    id: int
    name: str
    phone: str | None
    status: RiderStatus
    lat: float | None = None
    lng: float | None = None
    location_updated_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class VehicleCreate(BaseModel):
    plate_number: str
    type: str
    status: VehicleStatus = VehicleStatus.idle
    rider_id: int | None = None


class VehicleUpdate(BaseModel):
    plate_number: str | None = None
    type: str | None = None
    status: VehicleStatus | None = None
    rider_id: int | None = None


class VehicleOut(BaseModel):
    id: int
    plate_number: str
    type: str
    status: VehicleStatus
    rider_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True
