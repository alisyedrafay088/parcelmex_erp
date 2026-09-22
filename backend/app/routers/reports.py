import csv
import io
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature
from app.models.client import Client
from app.models.parcel import Parcel, ParcelStatus
from app.models.rider import Rider
from app.schemas.report import ReportSummary

router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[Depends(require_feature("reports"))])


def _date_range(start: date, end: date) -> tuple[datetime, datetime]:
    return datetime.combine(start, time.min), datetime.combine(end, time.max)


def _count(db: Session, start: datetime, end: datetime, status: ParcelStatus | None = None) -> int:
    q = db.query(func.count(Parcel.id)).filter(Parcel.created_at >= start, Parcel.created_at <= end)
    if status:
        q = q.filter(Parcel.status == status)
    return q.scalar() or 0


@router.get("/summary", response_model=ReportSummary)
def get_summary(
    start: date = Query(...), end: date = Query(...), db: Session = Depends(get_db)
):
    range_start, range_end = _date_range(start, end)
    revenue = (
        db.query(func.coalesce(func.sum(Parcel.amount), 0))
        .filter(Parcel.created_at >= range_start, Parcel.created_at <= range_end)
        .scalar()
    )
    return ReportSummary(
        total_parcels=_count(db, range_start, range_end),
        delivered=_count(db, range_start, range_end, ParcelStatus.delivered),
        pending=_count(db, range_start, range_end, ParcelStatus.pending),
        delayed=_count(db, range_start, range_end, ParcelStatus.delayed),
        in_transit=_count(db, range_start, range_end, ParcelStatus.in_transit),
        cancelled=_count(db, range_start, range_end, ParcelStatus.cancelled),
        revenue=float(revenue or 0),
    )


@router.get("/export")
def export_csv(start: date = Query(...), end: date = Query(...), db: Session = Depends(get_db)):
    range_start, range_end = _date_range(start, end)
    rows = (
        db.query(Parcel, Client.name, Rider.name)
        .join(Client, Parcel.client_id == Client.id)
        .outerjoin(Rider, Parcel.rider_id == Rider.id)
        .filter(Parcel.created_at >= range_start, Parcel.created_at <= range_end)
        .order_by(Parcel.created_at.asc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Tracking ID", "Client", "Rider", "Status", "Amount (PKR)", "Created At", "Delivered At"]
    )
    for parcel, client_name, rider_name in rows:
        writer.writerow(
            [
                parcel.tracking_id,
                client_name,
                rider_name or "-",
                parcel.status.value,
                f"{parcel.amount:.2f}",
                parcel.created_at.strftime("%Y-%m-%d %H:%M"),
                parcel.delivered_at.strftime("%Y-%m-%d %H:%M") if parcel.delivered_at else "-",
            ]
        )

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="parcel_report_{start}_to_{end}.csv"'
        },
    )
