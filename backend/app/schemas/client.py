from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.client import ClientPlan, ClientStatus


class ClientCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    phone: str | None = None
    plan: ClientPlan = ClientPlan.basic
    status: ClientStatus = ClientStatus.active


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    phone: str | None = None
    plan: ClientPlan | None = None
    status: ClientStatus | None = None


class PortalAccountCreate(BaseModel):
    username: str
    password: str


class ClientOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    plan: ClientPlan
    status: ClientStatus
    created_at: datetime

    class Config:
        from_attributes = True
