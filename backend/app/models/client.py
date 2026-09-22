import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ClientPlan(str, enum.Enum):
    basic = "basic"
    standard = "standard"
    premium = "premium"


class ClientStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    plan: Mapped[ClientPlan] = mapped_column(Enum(ClientPlan), default=ClientPlan.basic)
    status: Mapped[ClientStatus] = mapped_column(Enum(ClientStatus), default=ClientStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
