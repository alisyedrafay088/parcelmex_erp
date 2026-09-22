from datetime import datetime

from pydantic import BaseModel


class WarehouseCreate(BaseModel):
    name: str
    address: str | None = None
    capacity: int | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    capacity: int | None = None


class WarehouseOut(BaseModel):
    id: int
    name: str
    address: str | None
    capacity: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class WarehouseSummary(WarehouseOut):
    parcel_count: int
