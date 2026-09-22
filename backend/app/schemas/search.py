from pydantic import BaseModel

from app.models.parcel import ParcelStatus


class ParcelSearchResult(BaseModel):
    id: int
    tracking_id: str
    status: ParcelStatus
    destination_address: str | None
    client_name: str


class RiderSearchResult(BaseModel):
    id: int
    name: str
    phone: str | None


class ClientSearchResult(BaseModel):
    id: int
    name: str
    email: str


class SearchResults(BaseModel):
    parcels: list[ParcelSearchResult]
    riders: list[RiderSearchResult]
    clients: list[ClientSearchResult]
