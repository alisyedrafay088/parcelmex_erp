from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature
from app.models.supply import Supply
from app.schemas.supply import SupplyCreate, SupplyOut, SupplyUpdate

router = APIRouter(prefix="/supplies", tags=["Packaging Supplies"], dependencies=[Depends(require_feature("supplies"))])


def _get_supply_or_404(db: Session, supply_id: int) -> Supply:
    supply = db.get(Supply, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Supply not found")
    return supply


@router.get("", response_model=list[SupplyOut])
def list_supplies(db: Session = Depends(get_db)):
    return db.query(Supply).order_by(Supply.name.asc()).all()


@router.post("", response_model=SupplyOut, status_code=201)
def create_supply(payload: SupplyCreate, db: Session = Depends(get_db)):
    supply = Supply(**payload.model_dump())
    db.add(supply)
    db.commit()
    db.refresh(supply)
    return supply


@router.patch("/{supply_id}", response_model=SupplyOut)
def update_supply(supply_id: int, payload: SupplyUpdate, db: Session = Depends(get_db)):
    supply = _get_supply_or_404(db, supply_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supply, field, value)
    db.commit()
    db.refresh(supply)
    return supply


@router.delete("/{supply_id}", status_code=204)
def delete_supply(supply_id: int, db: Session = Depends(get_db)):
    supply = _get_supply_or_404(db, supply_id)
    db.delete(supply)
    db.commit()
