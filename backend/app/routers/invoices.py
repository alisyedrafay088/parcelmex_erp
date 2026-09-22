from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature
from app.core.pdf import generate_invoice_pdf
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.parcel import Parcel
from app.schemas.invoice import InvoiceGenerate, InvoiceOut, InvoiceUpdate

router = APIRouter(
    prefix="/invoices", tags=["Invoicing & Billing"], dependencies=[Depends(require_feature("invoicing"))]
)


@router.get("", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db)):
    return db.query(Invoice).order_by(Invoice.issued_at.desc()).all()


@router.post("/generate", response_model=InvoiceOut, status_code=201)
def generate_invoice(payload: InvoiceGenerate, db: Session = Depends(get_db)):
    client = db.get(Client, payload.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if payload.period_end < payload.period_start:
        raise HTTPException(status_code=400, detail="period_end must be after period_start")

    range_start = datetime.combine(payload.period_start, time.min)
    range_end = datetime.combine(payload.period_end, time.max)

    total = (
        db.query(func.coalesce(func.sum(Parcel.amount), 0))
        .filter(
            Parcel.client_id == payload.client_id,
            Parcel.created_at >= range_start,
            Parcel.created_at <= range_end,
        )
        .scalar()
    )

    invoice = Invoice(
        invoice_number="PENDING",
        client_id=payload.client_id,
        amount=total,
        period_start=payload.period_start,
        period_end=payload.period_end,
        due_date=payload.due_date,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    invoice.invoice_number = f"INV-{invoice.id:04d}"
    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: int, payload: InvoiceUpdate, db: Session = Depends(get_db)):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = payload.status
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = db.get(Client, invoice.client_id)
    pdf_bytes = generate_invoice_pdf(invoice, client)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
        },
    )


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
