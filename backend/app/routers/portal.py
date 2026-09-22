from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.bulk_upload import parse_upload
from app.core.database import get_db
from app.core.deps import require_client
from app.core.pdf import generate_airway_bill_pdf, generate_invoice_pdf
from app.core.prediction import DeliveryPredictor, build_parcel_out
from app.core.tracking import next_parcel_tracking_id
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.parcel import Parcel, ParcelStatus
from app.models.rider import Rider
from app.models.user import User
from app.schemas.invoice import InvoiceOut
from app.schemas.parcel import AddressVerificationUpdate, ParcelOut, PortalParcelBatchCreate, PortalParcelCreate
from app.schemas.portal import BulkUploadResult, PortalClientOut, PortalParcelOut, PortalParcelUpdate, PortalSummary

MAX_BULK_ROWS = 500

router = APIRouter(prefix="/portal", tags=["Customer Portal"], dependencies=[Depends(require_client)])


@router.get("/me", response_model=PortalClientOut)
def get_me(current_user: User = Depends(require_client), db: Session = Depends(get_db)):
    client = db.get(Client, current_user.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client record not found")
    return client


@router.get("/summary", response_model=PortalSummary)
def get_summary(current_user: User = Depends(require_client), db: Session = Depends(get_db)):
    base = db.query(func.count(Parcel.id)).filter(Parcel.client_id == current_user.client_id)

    def count_status(status: ParcelStatus) -> int:
        return base.filter(Parcel.status == status).scalar() or 0

    return PortalSummary(
        total_parcels=base.scalar() or 0,
        in_transit=count_status(ParcelStatus.in_transit),
        delivered=count_status(ParcelStatus.delivered),
        pending=count_status(ParcelStatus.pending),
    )


@router.get("/parcels", response_model=list[PortalParcelOut])
def list_my_parcels(current_user: User = Depends(require_client), db: Session = Depends(get_db)):
    parcels = (
        db.query(Parcel)
        .filter(Parcel.client_id == current_user.client_id)
        .order_by(Parcel.created_at.desc())
        .all()
    )
    rider_ids = {p.rider_id for p in parcels if p.rider_id is not None}
    riders = {r.id: r for r in db.query(Rider).filter(Rider.id.in_(rider_ids)).all()} if rider_ids else {}
    predictor = DeliveryPredictor(db)
    return [
        PortalParcelOut(
            **build_parcel_out(p, predictor).model_dump(),
            rider_name=riders[p.rider_id].name if p.rider_id in riders else None,
            rider_phone=riders[p.rider_id].phone if p.rider_id in riders else None,
        )
        for p in parcels
    ]


@router.get("/parcels/track/{tracking_id}", response_model=PortalParcelOut)
def track_my_parcel(tracking_id: str, current_user: User = Depends(require_client), db: Session = Depends(get_db)):
    parcel = (
        db.query(Parcel)
        .filter(Parcel.tracking_id == tracking_id, Parcel.client_id == current_user.client_id)
        .first()
    )
    if not parcel:
        raise HTTPException(status_code=404, detail="No parcel found with that tracking ID")
    rider = db.get(Rider, parcel.rider_id) if parcel.rider_id else None
    predictor = DeliveryPredictor(db)
    return PortalParcelOut(
        **build_parcel_out(parcel, predictor).model_dump(),
        rider_name=rider.name if rider else None,
        rider_phone=rider.phone if rider else None,
    )


@router.patch("/parcels/{parcel_id}", response_model=ParcelOut)
def update_my_parcel(
    parcel_id: int,
    payload: PortalParcelUpdate,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db),
):
    parcel = db.get(Parcel, parcel_id)
    if not parcel or parcel.client_id != current_user.client_id:
        raise HTTPException(status_code=404, detail="Parcel not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(parcel, field, value)

    db.commit()
    db.refresh(parcel)
    return build_parcel_out(parcel, DeliveryPredictor(db))


@router.patch("/parcels/{parcel_id}/address-verification", response_model=ParcelOut)
def update_my_address_verification(
    parcel_id: int,
    payload: AddressVerificationUpdate,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db),
):
    parcel = db.get(Parcel, parcel_id)
    if not parcel or parcel.client_id != current_user.client_id:
        raise HTTPException(status_code=404, detail="Parcel not found")

    if payload.destination_address is not None:
        parcel.destination_address = payload.destination_address
    parcel.address_status = payload.status
    parcel.address_lat = payload.lat
    parcel.address_lng = payload.lng
    parcel.address_verified_at = datetime.utcnow()

    db.commit()
    db.refresh(parcel)
    return build_parcel_out(parcel, DeliveryPredictor(db))


def _new_parcel(db: Session, client_id: int, item: PortalParcelCreate) -> Parcel:
    return Parcel(
        tracking_id=next_parcel_tracking_id(db),
        client_id=client_id,
        status=ParcelStatus.pending,
        description=item.description,
        destination_address=item.destination_address,
        receiver_name=item.receiver_name,
        receiver_phone=item.receiver_phone,
        weight_kg=item.weight_kg,
        quantity=item.quantity,
        rate_per_kg=0,
        amount=0,
    )


@router.post("/parcels", response_model=ParcelOut, status_code=201)
def book_my_parcel(
    payload: PortalParcelCreate,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db),
):
    parcel = _new_parcel(db, current_user.client_id, payload)
    db.add(parcel)
    db.commit()
    db.refresh(parcel)
    return build_parcel_out(parcel, DeliveryPredictor(db))


@router.post("/parcels/batch", response_model=list[ParcelOut], status_code=201)
def book_my_parcels_batch(
    payload: PortalParcelBatchCreate,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db),
):
    parcels = []
    for item in payload.items:
        parcel = _new_parcel(db, current_user.client_id, item)
        db.add(parcel)
        db.flush()
        parcels.append(parcel)
    db.commit()
    for parcel in parcels:
        db.refresh(parcel)
    predictor = DeliveryPredictor(db)
    return [build_parcel_out(p, predictor) for p in parcels]


@router.post("/parcels/bulk-upload", response_model=BulkUploadResult)
async def bulk_upload_parcels(
    file: UploadFile = File(...),
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx")):
        raise HTTPException(status_code=400, detail="Please upload a .csv or .xlsx file")

    content = await file.read()
    try:
        parsed_rows, errors = parse_upload(file.filename, content)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the file. Please check the format.")

    if len(parsed_rows) > MAX_BULK_ROWS:
        raise HTTPException(status_code=400, detail=f"Too many rows. Max {MAX_BULK_ROWS} per upload.")

    created = 0
    for row in parsed_rows:
        parcel = Parcel(
            tracking_id=next_parcel_tracking_id(db),
            client_id=current_user.client_id,
            status=ParcelStatus.pending,
            description=row.description,
            destination_address=row.destination_address,
            weight_kg=row.weight_kg,
            quantity=row.quantity,
            rate_per_kg=0,
            amount=0,
        )
        db.add(parcel)
        db.flush()
        created += 1

    db.commit()
    return BulkUploadResult(created=created, errors=errors)


@router.get("/invoices", response_model=list[InvoiceOut])
def list_my_invoices(current_user: User = Depends(require_client), db: Session = Depends(get_db)):
    return (
        db.query(Invoice)
        .filter(Invoice.client_id == current_user.client_id)
        .order_by(Invoice.issued_at.desc())
        .all()
    )


@router.get("/invoices/{invoice_id}/pdf")
def download_my_invoice_pdf(
    invoice_id: int, current_user: User = Depends(require_client), db: Session = Depends(get_db)
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice or invoice.client_id != current_user.client_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    client = db.get(Client, current_user.client_id)
    pdf_bytes = generate_invoice_pdf(invoice, client)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'},
    )


@router.get("/parcels/{parcel_id}/airway-bill")
def download_my_airway_bill(
    parcel_id: int, current_user: User = Depends(require_client), db: Session = Depends(get_db)
):
    parcel = db.get(Parcel, parcel_id)
    if not parcel or parcel.client_id != current_user.client_id:
        raise HTTPException(status_code=404, detail="Parcel not found")
    client = db.get(Client, current_user.client_id)
    pdf_bytes = generate_airway_bill_pdf(parcel, client)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{parcel.tracking_id}-airway-bill.pdf"'},
    )


