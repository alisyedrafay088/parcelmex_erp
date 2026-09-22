from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature
from app.core.pdf import generate_airway_bill_pdf
from app.core.prediction import DeliveryPredictor, build_parcel_out
from app.core.tracking import next_parcel_tracking_id
from app.models.client import Client
from app.models.parcel import Parcel, ParcelStatus
from app.models.rider import Rider
from app.models.warehouse import Warehouse
from app.schemas.parcel import AddressVerificationUpdate, ParcelCreate, ParcelOut, ParcelTrackOut, ParcelUpdate

router = APIRouter(prefix="/parcels", tags=["Parcel Booking"], dependencies=[Depends(require_feature("parcels"))])

MAX_WEIGHT_KG = 999999.99
MAX_RATE_PER_KG = 99999999.99


def _validate_parcel_numbers(weight_kg: float | None, quantity: int | None, rate_per_kg: float | None) -> None:
    if weight_kg is not None:
        if weight_kg <= 0:
            raise HTTPException(status_code=400, detail="weight_kg must be greater than 0")
        if weight_kg > MAX_WEIGHT_KG:
            raise HTTPException(status_code=400, detail=f"weight_kg must be at most {MAX_WEIGHT_KG}")
    if quantity is not None and quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be greater than 0")
    if rate_per_kg is not None:
        if rate_per_kg < 0:
            raise HTTPException(status_code=400, detail="rate_per_kg cannot be negative")
        if rate_per_kg > MAX_RATE_PER_KG:
            raise HTTPException(status_code=400, detail=f"rate_per_kg must be at most {MAX_RATE_PER_KG}")


@router.get("", response_model=list[ParcelOut])
def list_parcels(db: Session = Depends(get_db)):
    parcels = db.query(Parcel).order_by(Parcel.created_at.desc()).all()
    predictor = DeliveryPredictor(db)
    return [build_parcel_out(p, predictor) for p in parcels]


@router.get("/track/{tracking_id}", response_model=ParcelTrackOut)
def track_parcel(tracking_id: str, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.tracking_id == tracking_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="No parcel found with that tracking ID")
    client = db.get(Client, parcel.client_id)
    rider = db.get(Rider, parcel.rider_id) if parcel.rider_id else None
    predictor = DeliveryPredictor(db)
    return ParcelTrackOut(
        **build_parcel_out(parcel, predictor).model_dump(),
        client_name=client.name if client else f"#{parcel.client_id}",
        rider_name=rider.name if rider else None,
        rider_phone=rider.phone if rider else None,
    )


@router.post("", response_model=ParcelOut, status_code=201)
def create_parcel(payload: ParcelCreate, db: Session = Depends(get_db)):
    if not db.get(Client, payload.client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    if payload.rider_id is not None and not db.get(Rider, payload.rider_id):
        raise HTTPException(status_code=404, detail="Rider not found")
    if payload.warehouse_id is not None and not db.get(Warehouse, payload.warehouse_id):
        raise HTTPException(status_code=404, detail="Warehouse not found")
    _validate_parcel_numbers(payload.weight_kg, payload.quantity, payload.rate_per_kg)

    parcel = Parcel(
        tracking_id=next_parcel_tracking_id(db),
        client_id=payload.client_id,
        rider_id=payload.rider_id,
        warehouse_id=payload.warehouse_id,
        status=payload.status,
        description=payload.description,
        destination_address=payload.destination_address,
        receiver_name=payload.receiver_name,
        receiver_phone=payload.receiver_phone,
        weight_kg=payload.weight_kg,
        quantity=payload.quantity,
        rate_per_kg=payload.rate_per_kg,
        amount=round(payload.weight_kg * payload.rate_per_kg, 2),
    )
    db.add(parcel)
    db.commit()
    db.refresh(parcel)
    return build_parcel_out(parcel, DeliveryPredictor(db))


@router.patch("/{parcel_id}", response_model=ParcelOut)
def update_parcel(parcel_id: int, payload: ParcelUpdate, db: Session = Depends(get_db)):
    parcel = db.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    data = payload.model_dump(exclude_unset=True)
    if "rider_id" in data and data["rider_id"] is not None and not db.get(Rider, data["rider_id"]):
        raise HTTPException(status_code=404, detail="Rider not found")
    if "warehouse_id" in data and data["warehouse_id"] is not None and not db.get(Warehouse, data["warehouse_id"]):
        raise HTTPException(status_code=404, detail="Warehouse not found")
    _validate_parcel_numbers(data.get("weight_kg"), data.get("quantity"), data.get("rate_per_kg"))

    for field, value in data.items():
        setattr(parcel, field, value)

    if "weight_kg" in data or "rate_per_kg" in data:
        parcel.amount = round(float(parcel.weight_kg) * float(parcel.rate_per_kg), 2)

    if data.get("status") == ParcelStatus.delivered and parcel.delivered_at is None:
        parcel.delivered_at = datetime.utcnow()

    db.commit()
    db.refresh(parcel)
    return build_parcel_out(parcel, DeliveryPredictor(db))


@router.patch("/{parcel_id}/address-verification", response_model=ParcelOut)
def update_address_verification(parcel_id: int, payload: AddressVerificationUpdate, db: Session = Depends(get_db)):
    parcel = db.get(Parcel, parcel_id)
    if not parcel:
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


@router.delete("/{parcel_id}", status_code=204)
def delete_parcel(parcel_id: int, db: Session = Depends(get_db)):
    parcel = db.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    db.delete(parcel)
    db.commit()


@router.get("/{parcel_id}/airway-bill")
def download_airway_bill(parcel_id: int, db: Session = Depends(get_db)):
    parcel = db.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    client = db.get(Client, parcel.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    pdf_bytes = generate_airway_bill_pdf(parcel, client)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{parcel.tracking_id}-airway-bill.pdf"'},
    )
