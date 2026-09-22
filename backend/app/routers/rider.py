from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_rider
from app.core.prediction import DeliveryPredictor, build_parcel_out
from app.models.client import Client
from app.models.parcel import Parcel, ParcelStatus
from app.models.rider import Rider
from app.models.user import User
from app.schemas.rider import (
    RIDER_ALLOWED_STATUSES,
    RiderLocationUpdate,
    RiderMeOut,
    RiderParcelOut,
    RiderParcelStatusUpdate,
    RiderStatusUpdate,
)

router = APIRouter(prefix="/rider", tags=["Rider"], dependencies=[Depends(require_rider)])


@router.get("/me", response_model=RiderMeOut)
def get_me(current_user: User = Depends(require_rider), db: Session = Depends(get_db)):
    rider = db.get(Rider, current_user.rider_id)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider record not found")
    return rider


@router.patch("/status", response_model=RiderMeOut)
def update_my_status(
    payload: RiderStatusUpdate, current_user: User = Depends(require_rider), db: Session = Depends(get_db)
):
    rider = db.get(Rider, current_user.rider_id)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider record not found")
    rider.status = payload.status
    db.commit()
    db.refresh(rider)
    return rider


@router.patch("/location", response_model=RiderMeOut)
def update_my_location(
    payload: RiderLocationUpdate, current_user: User = Depends(require_rider), db: Session = Depends(get_db)
):
    rider = db.get(Rider, current_user.rider_id)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider record not found")
    rider.lat = payload.lat
    rider.lng = payload.lng
    rider.location_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rider)
    return rider


@router.get("/parcels", response_model=list[RiderParcelOut])
def list_my_parcels(current_user: User = Depends(require_rider), db: Session = Depends(get_db)):
    parcels = (
        db.query(Parcel)
        .filter(Parcel.rider_id == current_user.rider_id)
        .order_by(Parcel.created_at.desc())
        .all()
    )
    client_ids = {p.client_id for p in parcels}
    clients_by_id = {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()} if client_ids else {}
    predictor = DeliveryPredictor(db)
    return [
        RiderParcelOut(
            **build_parcel_out(p, predictor).model_dump(),
            client_name=clients_by_id[p.client_id].name if p.client_id in clients_by_id else f"#{p.client_id}",
        )
        for p in parcels
    ]


@router.patch("/parcels/{parcel_id}/status", response_model=RiderParcelOut)
def update_my_parcel_status(
    parcel_id: int,
    payload: RiderParcelStatusUpdate,
    current_user: User = Depends(require_rider),
    db: Session = Depends(get_db),
):
    parcel = db.get(Parcel, parcel_id)
    if not parcel or parcel.rider_id != current_user.rider_id:
        raise HTTPException(status_code=404, detail="Parcel not found")

    if payload.status not in RIDER_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Riders can only mark: picked, packed, in transit, delivered")

    parcel.status = payload.status
    if payload.status == ParcelStatus.delivered and parcel.delivered_at is None:
        parcel.delivered_at = datetime.utcnow()
    db.commit()
    db.refresh(parcel)

    client = db.get(Client, parcel.client_id)
    predictor = DeliveryPredictor(db)
    return RiderParcelOut(
        **build_parcel_out(parcel, predictor).model_dump(),
        client_name=client.name if client else f"#{parcel.client_id}",
    )
