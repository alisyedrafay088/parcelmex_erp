import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ParcelStatus(str, enum.Enum):
    pending = "pending"
    picked = "picked"
    packed = "packed"
    in_transit = "in_transit"
    delivered = "delivered"
    delayed = "delayed"
    cancelled = "cancelled"


class AddressVerificationStatus(str, enum.Enum):
    unverified = "unverified"
    verified = "verified"
    needs_review = "needs_review"


class Parcel(Base):
    __tablename__ = "parcels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tracking_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    rider_id: Mapped[int] = mapped_column(ForeignKey("riders.id"), nullable=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"), nullable=True)
    status: Mapped[ParcelStatus] = mapped_column(Enum(ParcelStatus), default=ParcelStatus.pending)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    destination_address: Mapped[str] = mapped_column(String(255), nullable=True)
    receiver_name: Mapped[str] = mapped_column(String(150), nullable=True)
    receiver_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    address_status: Mapped[AddressVerificationStatus] = mapped_column(
        Enum(AddressVerificationStatus), default=AddressVerificationStatus.unverified
    )
    address_lat: Mapped[float] = mapped_column(Float, nullable=True)
    address_lng: Mapped[float] = mapped_column(Float, nullable=True)
    address_verified_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    weight_kg: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    rate_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    delivered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
