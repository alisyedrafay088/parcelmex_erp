from pydantic import BaseModel


class PermissionMatrixOut(BaseModel):
    features: list[str]
    roles: list[str]
    matrix: dict[str, dict[str, bool]]


class PermissionMatrixUpdate(BaseModel):
    matrix: dict[str, dict[str, bool]]


class MyFeaturesOut(BaseModel):
    features: list[str]
