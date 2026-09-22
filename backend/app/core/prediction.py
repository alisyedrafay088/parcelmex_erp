from collections import defaultdict
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.parcel import Parcel, ParcelStatus
from app.schemas.parcel import ParcelOut

DEFAULT_DELIVERY_HOURS = 48.0
MIN_SAMPLES = 3
MIN_PREDICTED_HOURS = 4.0
MAX_PREDICTED_HOURS = 168.0

# How quickly a segment's own average is trusted over the global average.
# A segment with SEGMENT_SMOOTHING samples gets ~50% weight; more samples -> more weight.
SEGMENT_SMOOTHING = 4.0

CITY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "karachi": ("karachi",),
    "lahore": ("lahore",),
    "islamabad": ("islamabad",),
    "rawalpindi": ("rawalpindi", "pindi"),
    "faisalabad": ("faisalabad",),
    "multan": ("multan",),
    "peshawar": ("peshawar",),
    "quetta": ("quetta",),
    "hyderabad": ("hyderabad",),
    "sialkot": ("sialkot",),
    "gujranwala": ("gujranwala",),
}


def detect_city(address: str | None) -> str | None:
    if not address:
        return None
    lowered = address.lower()
    for city, keywords in CITY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return city
    return None


def weight_bucket(weight_kg: float | None) -> str:
    value = float(weight_kg) if weight_kg is not None else 0.0
    if value < 5:
        return "light"
    if value <= 20:
        return "medium"
    return "heavy"


class _Segment:
    __slots__ = ("total_hours", "count")

    def __init__(self) -> None:
        self.total_hours = 0.0
        self.count = 0

    def add(self, hours: float) -> None:
        self.total_hours += hours
        self.count += 1

    @property
    def average(self) -> float:
        return self.total_hours / self.count if self.count else 0.0


class DeliveryPredictor:
    """
    Estimates delivery time by blending several historical averages (destination
    city, parcel weight class, client) with the overall average, weighted by how
    many past deliveries back each segment up. Segments with little history get
    shrunk toward the global average instead of over-fitting to a handful of parcels.
    """

    def __init__(self, db: Session):
        rows = (
            db.query(
                Parcel.created_at,
                Parcel.delivered_at,
                Parcel.destination_address,
                Parcel.weight_kg,
                Parcel.client_id,
            )
            .filter(Parcel.status == ParcelStatus.delivered, Parcel.delivered_at.isnot(None))
            .all()
        )

        self.global_segment = _Segment()
        self.city_segments: dict[str, _Segment] = defaultdict(_Segment)
        self.bucket_segments: dict[str, _Segment] = defaultdict(_Segment)
        self.client_segments: dict[int, _Segment] = defaultdict(_Segment)

        for created_at, delivered_at, destination_address, weight_kg, client_id in rows:
            hours = (delivered_at - created_at).total_seconds() / 3600
            if hours <= 0:
                continue

            self.global_segment.add(hours)

            city = detect_city(destination_address)
            if city:
                self.city_segments[city].add(hours)

            self.bucket_segments[weight_bucket(weight_kg)].add(hours)

            if client_id is not None:
                self.client_segments[client_id].add(hours)

        self.global_average = (
            self.global_segment.average if self.global_segment.count >= MIN_SAMPLES else DEFAULT_DELIVERY_HOURS
        )

    def _shrunk_offset(self, segment: "_Segment | None") -> float:
        if not segment or segment.count == 0:
            return 0.0
        confidence = segment.count / (segment.count + SEGMENT_SMOOTHING)
        return (segment.average - self.global_average) * confidence

    def predict_hours(
        self,
        destination_address: str | None,
        weight_kg: float | None,
        client_id: int | None,
    ) -> float:
        predicted = self.global_average

        city = detect_city(destination_address)
        if city:
            predicted += self._shrunk_offset(self.city_segments.get(city))

        predicted += self._shrunk_offset(self.bucket_segments.get(weight_bucket(weight_kg)))

        if client_id is not None:
            predicted += self._shrunk_offset(self.client_segments.get(client_id))

        return max(MIN_PREDICTED_HOURS, min(MAX_PREDICTED_HOURS, predicted))


def build_parcel_out(parcel: Parcel, predictor: DeliveryPredictor) -> ParcelOut:
    estimated_delivery_at = None
    if parcel.status not in (ParcelStatus.delivered, ParcelStatus.cancelled):
        hours = predictor.predict_hours(parcel.destination_address, parcel.weight_kg, parcel.client_id)
        estimated_delivery_at = parcel.created_at + timedelta(hours=hours)

    return ParcelOut.model_validate(parcel).model_copy(update={"estimated_delivery_at": estimated_delivery_at})
