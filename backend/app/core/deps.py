import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.permission import RolePermission
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if username is None:
            raise credentials_error
    except jwt.PyJWTError:
        raise credentials_error

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_error
    return user


def require_owner(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user


def require_client(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.client or current_user.client_id is None:
        raise HTTPException(status_code=403, detail="Customer portal access required")
    return current_user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role in (UserRole.client, UserRole.rider):
        raise HTTPException(status_code=403, detail="Staff access required")
    return current_user


def require_rider(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.rider or current_user.rider_id is None:
        raise HTTPException(status_code=403, detail="Rider access required")
    return current_user


def require_feature(feature: str):
    """
    Gate an endpoint behind an admin-configurable feature toggle (Staff & Roles
    permission matrix) instead of a hardcoded role check. Owner always passes;
    client/rider never do (they have their own portal/rider routers); every other
    staff role is checked against the RolePermission table.
    """

    def dependency(
        current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
    ) -> User:
        if current_user.role == UserRole.owner:
            return current_user
        if current_user.role in (UserRole.client, UserRole.rider):
            raise HTTPException(status_code=403, detail="Staff access required")
        allowed = (
            db.query(RolePermission)
            .filter(
                RolePermission.role == current_user.role,
                RolePermission.feature == feature,
                RolePermission.enabled.is_(True),
            )
            .first()
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="You don't have access to this feature")
        return current_user

    return dependency
