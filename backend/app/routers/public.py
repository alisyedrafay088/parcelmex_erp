from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.prediction import DeliveryPredictor, build_parcel_out
from app.models.parcel import Parcel
from app.schemas.public import PublicParcelTrackOut

router = APIRouter(prefix="/public", tags=["Public Tracking"])


@router.get("/track/{tracking_id}", response_model=PublicParcelTrackOut)
def public_track_parcel(tracking_id: str, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.tracking_id == tracking_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="No parcel found with that tracking ID")
    predictor = DeliveryPredictor(db)
    return PublicParcelTrackOut(**build_parcel_out(parcel, predictor).model_dump())
