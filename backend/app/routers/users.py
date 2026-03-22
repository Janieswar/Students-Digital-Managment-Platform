import csv
import io
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.core.security import hash_password
from app.core.audit import log_event
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.faculty_profile import FacultyProfile
from app.models.refresh_token import RefreshToken
from app.models.department import Department
from app.models.section import Section
from app.schemas.user import CreateUserRequest, UpdateUserRequest, ResetPasswordRequest

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
async def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    count: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """List users with filtering and pagination. Admin only."""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    if count:
        return {"count": query.count()}

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", status_code=201)
async def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Create a single user. Admin only."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    if body.role == "student":
        if not all([body.usn, body.department_id, body.section_id, body.current_semester]):
            raise HTTPException(status_code=422, detail="Student requires: usn, department_id, section_id, current_semester")

        existing_usn = db.query(StudentProfile).filter(StudentProfile.usn == body.usn).first()
        if existing_usn:
            raise HTTPException(status_code=409, detail="A student with this USN already exists.")

        profile = StudentProfile(
            user_id=user.id,
            usn=body.usn,
            department_id=body.department_id,
            section_id=body.section_id,
            current_semester=body.current_semester,
            academic_year=body.academic_year or "",
        )
        db.add(profile)

    elif body.role == "faculty":
        if not all([body.employee_id, body.department_id]):
            raise HTTPException(status_code=422, detail="Faculty requires: employee_id, department_id")

        profile = FacultyProfile(
            user_id=user.id,
            employee_id=body.employee_id,
            department_id=body.department_id,
        )
        db.add(profile)

    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get user details. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Update user fields. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.email and body.email != user.email:
        existing = db.query(User).filter(User.email == body.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="A user with this email already exists.")
        user.email = body.email

    if body.name is not None:
        user.name = body.name

    if body.is_active is not None:
        user.is_active = body.is_active
        if not body.is_active:
            _revoke_all_tokens(db, user.id)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Permanently delete a user and all associated data. Admin only."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    email = user.email
    db.delete(user)
    db.commit()

    log_event(
        db=db,
        action="user.delete",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="user",
        resource_id=user_id,
        detail=f"Permanently deleted user: {email}",
        ip_address=None
    )


@router.patch("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Reset user password. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(body.new_password)
    _revoke_all_tokens(db, user.id)
    db.commit()
    
    log_event(
        db=db,
        action="user.reset_password",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="user",
        resource_id=user.id,
        detail=f"Admin reset password for user: {user.email}",
        ip_address=None
    )
    
    return {"message": "Password reset successfully"}


@router.post("/bulk-import")
async def bulk_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Bulk import students from CSV. Admin only."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds maximum (5MB)")

    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    required_columns = {"name", "email", "usn", "department_code", "semester", "section"}
    if not required_columns.issubset(set(reader.fieldnames or [])):
        missing = required_columns - set(reader.fieldnames or [])
        raise HTTPException(status_code=400, detail=f"CSV missing required columns: {', '.join(missing)}")

    imported = 0
    skipped = 0
    errors = []
    credentials = []

    for i, row in enumerate(reader, start=2):
        try:
            if db.query(User).filter(User.email == row["email"]).first():
                skipped += 1
                continue

            temp_password = secrets.token_urlsafe(8)

            user = User(
                email=row["email"],
                password_hash=hash_password(temp_password),
                name=row["name"],
                role="student",
                is_active=True,
            )
            db.add(user)
            db.flush()

            # Resolve department and section
            dept = db.query(Department).filter(Department.code == row["department_code"]).first()
            if not dept:
                skipped += 1
                errors.append({"row": i, "reason": f"Department '{row['department_code']}' not found"})
                continue

            sec = db.query(Section).filter(
                Section.department_id == dept.id,
                Section.name == row["section"],
                Section.semester == int(row["semester"])
            ).first()
            if not sec:
                skipped += 1
                errors.append({"row": i, "reason": f"Section '{row['section']}' for semester {row['semester']} not found in {row['department_code']}"})
                continue

            # Create student profile
            profile = StudentProfile(
                user_id=user.id,
                usn=row["usn"],
                department_id=dept.id,
                section_id=sec.id,
                current_semester=int(row["semester"]),
                academic_year=sec.academic_year
            )
            db.add(profile)

            credentials.append({"name": row["name"], "email": row["email"], "password": temp_password})
            imported += 1

        except Exception as e:
            errors.append({"row": i, "reason": str(e)})

    db.commit()
    
    if imported > 0:
        log_event(
            db=db,
            action="user.bulk_import",
            actor_id=current_user.id,
            actor_name=current_user.name,
            actor_role=current_user.role,
            resource_type="user",
            detail=f"Bulk imported {imported} users",
            extra={"imported": imported, "skipped": skipped, "errors": len(errors)},
            ip_address=None
        )

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "credentials": credentials,
    }


def _revoke_all_tokens(db: Session, user_id: str):
    """Revoke all active refresh tokens for a user."""
    from datetime import datetime, timezone
    tokens = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at == None,
    ).all()
    for token in tokens:
        token.revoked_at = datetime.now(timezone.utc).isoformat()
