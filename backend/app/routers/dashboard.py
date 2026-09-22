from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.chatbot import ChatbotError, build_staff_system_prompt, extract_mentioned_ids, stream_chat_reply
from app.core.database import get_db
from app.core.deps import require_staff
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.parcel import Parcel, ParcelStatus
from app.models.rider import Rider, RiderStatus
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.schemas.dashboard import (
    OverviewResponse,
    RevenueResponse,
    StatusOverviewResponse,
    TopClientPoint,
    TopClientsResponse,
    TrendPoint,
    TrendsResponse,
)

MAX_CHAT_CONTEXT_ITEMS = 8

router = APIRouter(
    prefix="/dashboard", tags=["Dashboard & Analytics"], dependencies=[Depends(require_staff)]
)


def _format_pkr(value: float) -> str:
    return f"PKR {round(value):,}"


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


@router.post("/chat")
def chat_with_assistant(
    payload: ChatRequest, current_user: User = Depends(require_staff), db: Session = Depends(get_db)
):
    overview_summary = (
        f"Total parcels: {db.query(func.count(Parcel.id)).scalar() or 0}\n"
        f"Pending: {_count_by_status(db, ParcelStatus.pending)}\n"
        f"Delivered: {_count_by_status(db, ParcelStatus.delivered)}\n"
        f"Delayed: {_count_by_status(db, ParcelStatus.delayed)}\n"
        f"In transit: {_count_by_status(db, ParcelStatus.in_transit)}"
    )

    parcels = db.query(Parcel).order_by(Parcel.created_at.desc()).limit(MAX_CHAT_CONTEXT_ITEMS).all()
    client_names = {c.id: c.name for c in db.query(Client.id, Client.name).all()}
    parcels_summary = "\n".join(
        f"- {p.tracking_id}: client={client_names.get(p.client_id, 'n/a')}, status={p.status.value}, "
        f"destination={p.destination_address or 'n/a'}, amount={_format_pkr(p.amount) if p.amount else 'pending'}"
        for p in parcels
    )

    invoices = db.query(Invoice).order_by(Invoice.issued_at.desc()).limit(MAX_CHAT_CONTEXT_ITEMS).all()
    invoices_summary = "\n".join(
        f"- {inv.invoice_number}: client={client_names.get(inv.client_id, 'n/a')}, status={inv.status.value}, "
        f"amount={_format_pkr(inv.amount)}, due={inv.due_date.isoformat() if inv.due_date else 'n/a'}"
        for inv in invoices
    )

    known_tracking_ids = {p.tracking_id for p in parcels}
    known_invoice_numbers = {inv.invoice_number for inv in invoices}
    mentioned_tracking_ids: set[str] = set()
    mentioned_invoice_numbers: set[str] = set()
    for m in payload.messages:
        if m.role != "user":
            continue
        tids, invs = extract_mentioned_ids(m.content)
        mentioned_tracking_ids |= tids
        mentioned_invoice_numbers |= invs
    mentioned_tracking_ids -= known_tracking_ids
    mentioned_invoice_numbers -= known_invoice_numbers

    specific_lines = []
    if mentioned_tracking_ids:
        found_parcels = db.query(Parcel).filter(Parcel.tracking_id.in_(mentioned_tracking_ids)).all()
        for p in found_parcels:
            specific_lines.append(
                f"- {p.tracking_id}: client={client_names.get(p.client_id, 'n/a')}, status={p.status.value}, "
                f"destination={p.destination_address or 'n/a'}, amount={_format_pkr(p.amount) if p.amount else 'pending'}"
            )
        found_ids = {p.tracking_id for p in found_parcels}
        for missing in mentioned_tracking_ids - found_ids:
            specific_lines.append(f"- {missing}: not found in records")

    if mentioned_invoice_numbers:
        found_invoices = db.query(Invoice).filter(Invoice.invoice_number.in_(mentioned_invoice_numbers)).all()
        for inv in found_invoices:
            specific_lines.append(
                f"- {inv.invoice_number}: client={client_names.get(inv.client_id, 'n/a')}, status={inv.status.value}, "
                f"amount={_format_pkr(inv.amount)}, due={inv.due_date.isoformat() if inv.due_date else 'n/a'}"
            )
        found_numbers = {inv.invoice_number for inv in found_invoices}
        for missing in mentioned_invoice_numbers - found_numbers:
            specific_lines.append(f"- {missing}: not found in records")

    specific_records_summary = "\n".join(specific_lines)

    system_prompt = build_staff_system_prompt(
        current_user.name, overview_summary, parcels_summary, invoices_summary, specific_records_summary
    )
    history = [{"role": m.role, "content": m.content} for m in payload.messages]

    generator = stream_chat_reply(system_prompt, history)
    try:
        first_piece = next(generator)
    except ChatbotError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except StopIteration:
        raise HTTPException(status_code=503, detail="The chat assistant returned an empty response.")

    def full_stream():
        yield first_piece
        try:
            yield from generator
        except ChatbotError:
            pass

    return StreamingResponse(full_stream(), media_type="text/plain; charset=utf-8")
