from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.faculty_section_assignment import FacultySectionAssignment


async def require_section_access(
    section_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    For faculty: verify they are assigned to the requested section.
    Admin bypasses this check.
    Students should use require_self_access instead.
    """
    # Admin bypasses all scope checks
    if current_user.role == "admin":
        return current_user

    # Faculty must be assigned to the section
    if current_user.role == "faculty":
        assignment = db.query(FacultySectionAssignment).filter(
            FacultySectionAssignment.faculty_id == current_user.id,
            FacultySectionAssignment.section_id == section_id,
        ).first()

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this section",
            )
        return current_user

    # Students should not reach this middleware for section-level endpoints
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions",
    )
