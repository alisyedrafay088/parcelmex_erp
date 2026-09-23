from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature, require_owner
from app.core.security import hash_password
from app.models.rider import Rider
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.schemas.auth import UserOut
from app.schemas.fleet import (
    RiderAccountCreate,
    RiderCreate,
    RiderOut,
    RiderUpdate,
    VehicleCreate,
    VehicleOut,
    VehicleUpdate,
)

router = APIRouter(prefix="/fleet", tags=["Fleet Management"], dependencies=[Depends(require_feature("fleet"))])


def _get_rider_or_404(db: Session, rider_id: int) -> Rider:
    rider = db.get(Rider, rider_id)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    return rider


def _get_vehicle_or_404(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.get("/riders", response_model=list[RiderOut])
def list_riders(db: Session = Depends(get_db)):
    return db.query(Rider).order_by(Rider.created_at.desc()).all()


@router.post("/riders", response_model=RiderOut, status_code=201)
def create_rider(payload: RiderCreate, db: Session = Depends(get_db)):
    rider = Rider(**payload.model_dump())
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


@router.patch("/riders/{rider_id}", response_model=RiderOut)
def update_rider(rider_id: int, payload: RiderUpdate, db: Session = Depends(get_db)):
    rider = _get_rider_or_404(db, rider_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rider, field, value)
    db.commit()
    db.refresh(rider)
    return rider


@router.delete("/riders/{rider_id}", status_code=204)
def delete_rider(rider_id: int, db: Session = Depends(get_db)):
    rider = _get_rider_or_404(db, rider_id)
    db.query(Vehicle).filter(Vehicle.rider_id == rider_id).update({"rider_id": None})
    db.delete(rider)
    db.commit()


@router.post(
    "/riders/{rider_id}/portal-account",
    response_model=UserOut,
    status_code=201,
    dependencies=[Depends(require_owner)],
)
def create_rider_account(rider_id: int, payload: RiderAccountCreate, db: Session = Depends(get_db)):
    rider = _get_rider_or_404(db, rider_id)

    existing_for_rider = db.query(User).filter(User.rider_id == rider_id).first()
    if existing_for_rider:
        raise HTTPException(status_code=400, detail="This rider already has a login")

    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    rider_user = User(
        name=rider.name,
        username=payload.username,
        email=f"rider{rider.id}@zuhaexpress.internal",
        password_hash=hash_password(payload.password),
        role=UserRole.rider,
        rider_id=rider.id,
    )
    db.add(rider_user)
    db.commit()
    db.refresh(rider_user)
    return rider_user


@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).order_by(Vehicle.created_at.desc()).all()


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    if payload.rider_id is not None:
        _get_rider_or_404(db, payload.rider_id)
    existing = db.query(Vehicle).filter(Vehicle.plate_number == payload.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plate number already registered")
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db)):
    vehicle = _get_vehicle_or_404(db, vehicle_id)
    data = payload.model_dump(exclude_unset=True)
    if "rider_id" in data and data["rider_id"] is not None:
        _get_rider_or_404(db, data["rider_id"])
    for field, value in data.items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = _get_vehicle_or_404(db, vehicle_id)
    db.delete(vehicle)
    db.commit()
