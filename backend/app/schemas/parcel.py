from datetime import datetime

from pydantic import BaseModel, Field

from app.models.parcel import AddressVerificationStatus, ParcelStatus

DEFAULT_RATE_PER_KG = 50.0


class ParcelCreate(BaseModel):
    client_id: int
    rider_id: int | None = None
    warehouse_id: int | None = None
    description: str | None = None
    destination_address: str | None = None
    receiver_name: str | None = None
    receiver_phone: str | None = None
    weight_kg: float
    quantity: int = 1
    rate_per_kg: float = DEFAULT_RATE_PER_KG
    status: ParcelStatus = ParcelStatus.pending


class ParcelUpdate(BaseModel):
    rider_id: int | None = None
    warehouse_id: int | None = None
    description: str | None = None
    destination_address: str | None = None
    receiver_name: str | None = None
    receiver_phone: str | None = None
    weight_kg: float | None = None
    quantity: int | None = None
    rate_per_kg: float | None = None
    amount: float | None = None
    status: ParcelStatus | None = None


class PortalParcelCreate(BaseModel):
    description: str | None = None
    destination_address: str = Field(min_length=1)
    receiver_name: str | None = None
    receiver_phone: str | None = None
    weight_kg: float = Field(gt=0)
    quantity: int = Field(default=1, gt=0)


class PortalParcelBatchCreate(BaseModel):
    items: list[PortalParcelCreate] = Field(min_length=1, max_length=100)


class ParcelOut(BaseModel):
    id: int
    tracking_id: str
    client_id: int
    rider_id: int | None
    warehouse_id: int | None
    status: ParcelStatus
    description: str | None
    destination_address: str | None
    receiver_name: str | None
    receiver_phone: str | None
    weight_kg: float
    quantity: int
    rate_per_kg: float
    amount: float
    address_status: AddressVerificationStatus
    address_lat: float | None
    address_lng: float | None
    address_verified_at: datetime | None
    created_at: datetime
    delivered_at: datetime | None
    estimated_delivery_at: datetime | None = None

    class Config:
        from_attributes = True


class ParcelTrackOut(ParcelOut):
    client_name: str
    rider_name: str | None = None
    rider_phone: str | None = None


class AddressVerificationUpdate(BaseModel):
    status: AddressVerificationStatus
    lat: float | None = None
    lng: float | None = None
    destination_address: str | None = None
