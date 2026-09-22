from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_staff
from app.models.client import Client
from app.models.parcel import Parcel
from app.models.rider import Rider
from app.schemas.search import ClientSearchResult, ParcelSearchResult, RiderSearchResult, SearchResults

router = APIRouter(prefix="/search", tags=["Search"], dependencies=[Depends(require_staff)])

MAX_RESULTS = 6


@router.get("", response_model=SearchResults)
def search(q: str = Query(min_length=2), db: Session = Depends(get_db)):
    term = f"%{q.strip()}%"

    parcels = (
        db.query(Parcel)
        .filter(
            or_(
                Parcel.tracking_id.ilike(term),
                Parcel.destination_address.ilike(term),
                Parcel.description.ilike(term),
            )
        )
        .order_by(Parcel.created_at.desc())
        .limit(MAX_RESULTS)
        .all()
    )
    client_ids = {p.client_id for p in parcels}
    clients_by_id = {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()} if client_ids else {}

    riders = (
        db.query(Rider)
        .filter(or_(Rider.name.ilike(term), Rider.phone.ilike(term)))
        .order_by(Rider.name)
        .limit(MAX_RESULTS)
        .all()
    )

    clients = (
        db.query(Client)
        .filter(or_(Client.name.ilike(term), Client.email.ilike(term)))
        .order_by(Client.name)
        .limit(MAX_RESULTS)
        .all()
    )

    return SearchResults(
        parcels=[
            ParcelSearchResult(
                id=p.id,
                tracking_id=p.tracking_id,
                status=p.status,
                destination_address=p.destination_address,
                client_name=clients_by_id[p.client_id].name if p.client_id in clients_by_id else f"#{p.client_id}",
            )
            for p in parcels
        ],
        riders=[RiderSearchResult(id=r.id, name=r.name, phone=r.phone) for r in riders],
        clients=[ClientSearchResult(id=c.id, name=c.name, email=c.email) for c in clients],
    )
