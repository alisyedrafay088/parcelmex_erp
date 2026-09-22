from datetime import datetime

from pydantic import BaseModel


class SupplyCreate(BaseModel):
    name: str
    unit: str = "pcs"
    quantity: int = 0
    reorder_level: int | None = None


class SupplyUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    quantity: int | None = None
    reorder_level: int | None = None


class SupplyOut(BaseModel):
    id: int
    name: str
    unit: str
    quantity: int
    reorder_level: int | None
    created_at: datetime

    class Config:
        from_attributes = True
