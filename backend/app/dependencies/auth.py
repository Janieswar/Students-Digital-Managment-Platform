from typing import List, Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.core.security import decode_access_token
from app.core.permissions import Permission, has_all_permissions
from app.models.user import User


async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Extract and validate JWT from cookie.
    Returns the authenticated User object.
    Raises 401 if not authenticated.
    """
    # Feature flag: skip auth if disabled
    if not settings.AUTH_ENABLED:
        # In dev mode, return a mock admin user or the first admin
        admin = db.query(User).filter(User.role == "admin").first()
        if admin:
            return admin
        raise HTTPException(status_code=401, detail="No admin user found. Run seed script.")

    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


def require_role(*roles: str):
    """
    Dependency factory that checks if the current user has one of the specified roles.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role("admin"))])
    """
    async def _check_role(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return _check_role


def require_permissions(*permissions: Permission):
    """
    Dependency factory that checks if the current user's role has all specified permissions.

    Usage:
        @router.post("/mark", dependencies=[Depends(require_permissions(Permission.ATTENDANCE_MARK))])
    """
    async def _check_permissions(current_user: User = Depends(get_current_user)):
        if not has_all_permissions(current_user.role, list(permissions)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return _check_permissions
