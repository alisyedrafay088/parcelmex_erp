from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_staff
from app.models.client import Client
from app.models.parcel import Parcel, ParcelStatus
from app.models.rider import Rider, RiderStatus
from app.schemas.dashboard import (
    OverviewResponse,
    RevenueResponse,
    StatusOverviewResponse,
    TopClientPoint,
    TopClientsResponse,
    TrendPoint,
    TrendsResponse,
)

router = APIRouter(
    prefix="/dashboard", tags=["Dashboard & Analytics"], dependencies=[Depends(require_staff)]
)


def _count_by_status(db: Session, status: ParcelStatus) -> int:
    return db.query(func.count(Parcel.id)).filter(Parcel.status == status).scalar() or 0


@router.get("/overview", response_model=OverviewResponse)
def get_overview(db: Session = Depends(get_db)):
    total_parcels = db.query(func.count(Parcel.id)).scalar() or 0
    active_riders = (
        db.query(func.count(Rider.id)).filter(Rider.status == RiderStatus.active).scalar() or 0
    )
    return OverviewResponse(
        total_parcels=total_parcels,
        active_riders=active_riders,
        pending_count=_count_by_status(db, ParcelStatus.pending),
        delivered_count=_count_by_status(db, ParcelStatus.delivered),
        delayed_count=_count_by_status(db, ParcelStatus.delayed),
    )


@router.get("/revenue", response_model=RevenueResponse)
def get_revenue(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    def sum_since(since: datetime) -> float:
        result = (
            db.query(func.coalesce(func.sum(Parcel.amount), 0))
            .filter(Parcel.created_at >= since)
            .scalar()
        )
        return float(result or 0)

    return RevenueResponse(
        daily=sum_since(now - timedelta(days=1)),
        weekly=sum_since(now - timedelta(days=7)),
        monthly=sum_since(now - timedelta(days=30)),
    )


@router.get("/status-overview", response_model=StatusOverviewResponse)
def get_status_overview(db: Session = Depends(get_db)):
    return StatusOverviewResponse(
        pending=_count_by_status(db, ParcelStatus.pending),
        delivered=_count_by_status(db, ParcelStatus.delivered),
        delayed=_count_by_status(db, ParcelStatus.delayed),
        in_transit=_count_by_status(db, ParcelStatus.in_transit),
        cancelled=_count_by_status(db, ParcelStatus.cancelled),
    )


@router.get("/trends", response_model=TrendsResponse)
def get_trends(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(func.date(Parcel.created_at).label("day"), func.count(Parcel.id))
        .filter(Parcel.created_at >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )
    points = [TrendPoint(date=row[0], count=row[1]) for row in rows]
    return TrendsResponse(points=points)


@router.get("/top-clients", response_model=TopClientsResponse)
def get_top_clients(limit: int = 6, db: Session = Depends(get_db)):
    rows = (
        db.query(Client.id, Client.name, func.count(Parcel.id))
        .join(Parcel, Parcel.client_id == Client.id)
        .group_by(Client.id, Client.name)
        .order_by(func.count(Parcel.id).desc())
        .limit(limit)
        .all()
    )
    clients = [TopClientPoint(client_id=r[0], client_name=r[1], parcel_count=r[2]) for r in rows]
    return TopClientsResponse(clients=clients)
