from datetime import date, datetime

from pydantic import BaseModel

from app.models.invoice import InvoiceStatus


class InvoiceGenerate(BaseModel):
    client_id: int
    period_start: date
    period_end: date
    due_date: date | None = None


class InvoiceUpdate(BaseModel):
    status: InvoiceStatus


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    amount: float
    status: InvoiceStatus
    period_start: date
    period_end: date
    due_date: date | None
    issued_at: datetime

    class Config:
        from_attributes = True
