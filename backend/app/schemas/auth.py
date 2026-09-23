from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.owner


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    role: UserRole | None = None
    password: str | None = None


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    email: str
    role: UserRole
    client_id: int | None = None
    rider_id: int | None = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
