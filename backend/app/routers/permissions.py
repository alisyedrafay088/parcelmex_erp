from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_owner
from app.core.permissions import CONFIGURABLE_ROLES, FEATURES
from app.models.permission import RolePermission
from app.models.user import User, UserRole
from app.schemas.permission import MyFeaturesOut, PermissionMatrixOut, PermissionMatrixUpdate

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("/matrix", response_model=PermissionMatrixOut, dependencies=[Depends(require_owner)])
def get_matrix(db: Session = Depends(get_db)):
    matrix: dict[str, dict[str, bool]] = {
        role.value: {feature: False for feature in FEATURES} for role in CONFIGURABLE_ROLES
    }
    rows = (
        db.query(RolePermission)
        .filter(RolePermission.role.in_(CONFIGURABLE_ROLES))
        .all()
    )
    for row in rows:
        if row.feature in FEATURES:
            matrix[row.role.value][row.feature] = row.enabled
    return PermissionMatrixOut(
        features=FEATURES,
        roles=[role.value for role in CONFIGURABLE_ROLES],
        matrix=matrix,
    )


@router.put("/matrix", response_model=PermissionMatrixOut, dependencies=[Depends(require_owner)])
def update_matrix(payload: PermissionMatrixUpdate, db: Session = Depends(get_db)):
    configurable_values = {role.value for role in CONFIGURABLE_ROLES}
    for role_value, feature_flags in payload.matrix.items():
        if role_value not in configurable_values:
            continue
        role = UserRole(role_value)
        for feature, enabled in feature_flags.items():
            if feature not in FEATURES:
                continue
            row = (
                db.query(RolePermission)
                .filter(RolePermission.role == role, RolePermission.feature == feature)
                .first()
            )
            if row:
                row.enabled = enabled
            else:
                db.add(RolePermission(role=role, feature=feature, enabled=enabled))
    db.commit()
    return get_matrix(db)


@router.get("/me", response_model=MyFeaturesOut)
def get_my_features(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.owner:
        return MyFeaturesOut(features=FEATURES)
    if current_user.role in (UserRole.client, UserRole.rider):
        return MyFeaturesOut(features=[])
    rows = (
        db.query(RolePermission)
        .filter(RolePermission.role == current_user.role, RolePermission.enabled.is_(True))
        .all()
    )
    return MyFeaturesOut(features=[row.feature for row in rows])
