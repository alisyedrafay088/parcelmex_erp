from datetime import date

from pydantic import BaseModel


class OverviewResponse(BaseModel):
    total_parcels: int
    active_riders: int
    pending_count: int
    delivered_count: int
    delayed_count: int


class RevenueResponse(BaseModel):
    daily: float
    weekly: float
    monthly: float


class StatusOverviewResponse(BaseModel):
    pending: int
    delivered: int
    delayed: int
    in_transit: int
    cancelled: int


class TrendPoint(BaseModel):
    date: date
    count: int


class TrendsResponse(BaseModel):
    points: list[TrendPoint]


class TopClientPoint(BaseModel):
    client_id: int
    client_name: str
    parcel_count: int


class TopClientsResponse(BaseModel):
    clients: list[TopClientPoint]
