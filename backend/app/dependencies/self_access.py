from fastapi import Depends, HTTPException, status

from app.dependencies.auth import get_current_user
from app.models.user import User


async def require_self_access(
    student_id: str,
    current_user: User = Depends(get_current_user),
) -> User:
    """
    For students: verify they are accessing their own records.
    Admin bypasses this check.
    """
    # Admin bypasses
    if current_user.role == "admin":
        return current_user

    # Faculty with section access is handled separately
    if current_user.role == "faculty":
        return current_user  # Further check in require_section_access

    # Student must be accessing own data
    if current_user.role == "student":
        if current_user.id != student_id and student_id != "me":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own records",
            )
        return current_user

    raise HTTPException(status_code=403, detail="Insufficient permissions")
