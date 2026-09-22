from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_feature, require_owner
from app.core.security import hash_password
from app.models.client import Client
from app.models.user import User, UserRole
from app.schemas.auth import UserOut
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate, PortalAccountCreate

router = APIRouter(
    prefix="/clients", tags=["Client Management"], dependencies=[Depends(require_feature("clients"))]
)


def _get_client_or_404(db: Session, client_id: int) -> Client:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.get("", response_model=list[ClientOut])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).order_by(Client.created_at.desc()).all()


@router.post("", response_model=ClientOut, status_code=201)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, payload: ClientUpdate, db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id)
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"] != client.email:
        existing = db.query(Client).filter(Client.email == data["email"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    for field, value in data.items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.post(
    "/{client_id}/portal-account",
    response_model=UserOut,
    status_code=201,
    dependencies=[Depends(require_owner)],
)
def create_portal_account(client_id: int, payload: PortalAccountCreate, db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id)

    existing_for_client = db.query(User).filter(User.client_id == client_id).first()
    if existing_for_client:
        raise HTTPException(status_code=400, detail="This client already has a portal login")

    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    existing_email = db.query(User).filter(User.email == client.email).first()
    if existing_email:
        raise HTTPException(
            status_code=400, detail="A user account already uses this client's email"
        )

    portal_user = User(
        name=client.name,
        username=payload.username,
        email=client.email,
        password_hash=hash_password(payload.password),
        role=UserRole.client,
        client_id=client.id,
    )
    db.add(portal_user)
    db.commit()
    db.refresh(portal_user)
    return portal_user


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id)
    db.delete(client)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Cannot delete client with existing parcels or users"
        )
