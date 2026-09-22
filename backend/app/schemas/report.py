from pydantic import BaseModel


class ReportSummary(BaseModel):
    total_parcels: int
    delivered: int
    pending: int
    delayed: int
    in_transit: int
    cancelled: int
    revenue: float
