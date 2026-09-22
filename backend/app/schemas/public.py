from datetime import datetime

from pydantic import BaseModel

from app.models.parcel import ParcelStatus


class PublicParcelTrackOut(BaseModel):
    tracking_id: str
    status: ParcelStatus
    destination_address: str | None
    weight_kg: float
    quantity: int
    created_at: datetime
    delivered_at: datetime | None
    estimated_delivery_at: datetime | None = None
