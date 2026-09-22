from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature
from app.models.parcel import Parcel
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseOut, WarehouseSummary, WarehouseUpdate

router = APIRouter(prefix="/warehouses", tags=["Warehouse Management"], dependencies=[Depends(require_feature("warehouses"))])


def _get_warehouse_or_404(db: Session, warehouse_id: int) -> Warehouse:
    warehouse = db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.get("", response_model=list[WarehouseSummary])
def list_warehouses(db: Session = Depends(get_db)):
    counts = dict(
        db.query(Parcel.warehouse_id, func.count(Parcel.id))
        .filter(Parcel.warehouse_id.isnot(None))
        .group_by(Parcel.warehouse_id)
        .all()
    )
    warehouses = db.query(Warehouse).order_by(Warehouse.created_at.desc()).all()
    return [
        WarehouseSummary(
            id=w.id,
            name=w.name,
            address=w.address,
            capacity=w.capacity,
            created_at=w.created_at,
            parcel_count=counts.get(w.id, 0),
        )
        for w in warehouses
    ]


@router.post("", response_model=WarehouseOut, status_code=201)
def create_warehouse(payload: WarehouseCreate, db: Session = Depends(get_db)):
    warehouse = Warehouse(**payload.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.patch("/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(warehouse_id: int, payload: WarehouseUpdate, db: Session = Depends(get_db)):
    warehouse = _get_warehouse_or_404(db, warehouse_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(warehouse, field, value)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}", status_code=204)
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    warehouse = _get_warehouse_or_404(db, warehouse_id)
    db.query(Parcel).filter(Parcel.warehouse_id == warehouse_id).update({"warehouse_id": None})
    db.delete(warehouse)
    db.commit()
