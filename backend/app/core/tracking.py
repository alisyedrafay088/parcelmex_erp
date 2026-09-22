from sqlalchemy.orm import Session

from app.models.parcel import Parcel


def next_parcel_tracking_id(db: Session) -> str:
    last = db.query(Parcel).order_by(Parcel.id.desc()).first()
    next_id = (last.id if last else 0) + 1
    return f"PM-{next_id:06d}"
