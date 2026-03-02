# RBAC — Backend Implementation Guide

## Iteration: RBAC | FastAPI + SQLAlchemy + SQLite

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Step 1: Database Models & Migration](#2-step-1-database-models--migration)
3. [Step 2: Permission Map](#3-step-2-permission-map)
4. [Step 3: Security Utilities](#4-step-3-security-utilities)
5. [Step 4: Auth Dependencies (Middleware)](#5-step-4-auth-dependencies)
6. [Step 5: Pydantic Schemas (DTOs)](#6-step-5-pydantic-schemas)
7. [Step 6: Auth Router](#7-step-6-auth-router)
8. [Step 7: Users Router](#8-step-7-users-router)
9. [Step 8: Department & Section Routers](#9-step-8-department--section-routers)
10. [Step 9: Faculty Assignment Router](#10-step-9-faculty-assignment-router)
11. [Step 10: Apply Auth to Existing Routers](#11-step-10-apply-auth-to-existing-routers)
12. [Step 11: Update main.py](#12-step-11-update-mainpy)
13. [Step 12: Rate Limiting](#13-step-12-rate-limiting)
14. [Implementation Order & Dependencies](#14-implementation-order--dependencies)

---

## 1. Prerequisites

### Python Packages

Add to `requirements.txt` or `pyproject.toml`:

```
fastapi>=0.104.0
uvicorn>=0.24.0
sqlalchemy>=2.0.0
alembic>=1.13.0
pydantic[email]>=2.5.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
slowapi>=0.1.9
```

### Environment Variables

```bash
# .env
DATABASE_URL=sqlite:///./cec_student.db
JWT_SECRET=your-256-bit-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_COST=12
AUTH_ENABLED=true
SEED_ADMIN_EMAIL=admin@cec.edu.in
SEED_ADMIN_PASSWORD=Admin@123
CORS_ORIGINS=http://localhost:5173
```

### File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app entry point
│   ├── config.py                        # Settings from env vars
│   ├── database.py                      # SQLAlchemy engine + session
│   ├── seed.py                          # Seed script
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py                  # JWT + bcrypt utilities
│   │   └── permissions.py               # Role-permission map
│   ├── dependencies/
│   │   ├── __init__.py
│   │   ├── auth.py                      # require_auth, require_role
│   │   ├── department_access.py         # require_section_access
│   │   └── self_access.py              # require_self_access
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── refresh_token.py
│   │   ├── department.py
│   │   ├── section.py
│   │   ├── student_profile.py
│   │   ├── faculty_profile.py
│   │   └── faculty_section_assignment.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                      # LoginRequest, TokenResponse
│   │   ├── user.py                      # CreateUserRequest, UserResponse
│   │   ├── department.py
│   │   ├── section.py
│   │   └── assignment.py
│   └── routers/
│       ├── __init__.py
│       ├── auth.py                      # /api/auth/*
│       ├── users.py                     # /api/users/*
│       ├── departments.py               # /api/departments/*
│       ├── sections.py                  # /api/sections/*
│       └── assignments.py               # /api/faculty-assignments/*
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── requirements.txt
└── .env
```

---

## 2. Step 1: Database Models & Migration

### 2.1 Database Configuration

```python
# app/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite-specific
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.2 Models

See `05-database-schema.md` § 10 for complete SQLAlchemy model definitions. Create each model file as specified.

### 2.3 Run Migration

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Update alembic/env.py to import all models and use DATABASE_URL from config

# Generate migration
alembic revision --autogenerate -m "add_rbac_tables"

# Apply migration
alembic upgrade head
```

### 2.4 Verify

```bash
sqlite3 cec_student.db ".tables"
# Expected: users refresh_tokens departments sections student_profiles faculty_profiles faculty_section_assignments
```

---

## 3. Step 2: Permission Map

Define which permissions each role has. This is the single source of truth for authorization.

```python
# app/core/permissions.py

from enum import Enum
from typing import Dict, List


class Permission(str, Enum):
    # User management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_BULK_IMPORT = "user:bulk_import"

    # Department management
    DEPARTMENT_MANAGE = "department:manage"
    SECTION_MANAGE = "section:manage"

    # Attendance (future — defined here for guard readiness)
    ATTENDANCE_MARK = "attendance:mark"
    ATTENDANCE_EDIT = "attendance:edit"
    ATTENDANCE_VIEW = "attendance:view"

    # Marks (future)
    MARKS_ENTER = "marks:enter"
    MARKS_EDIT = "marks:edit"
    MARKS_VIEW = "marks:view"

    # Announcements
    ANNOUNCEMENT_CREATE = "announcement:create"
    ANNOUNCEMENT_VIEW = "announcement:view"

    # Fees
    FEE_VIEW = "fee:view"
    FEE_MANAGE = "fee:manage"

    # Timetable
    TIMETABLE_MANAGE = "timetable:manage"
    TIMETABLE_VIEW = "timetable:view"

    # Reports
    REPORT_VIEW_ALL = "report:view_all"

    # Config
    CONFIG_MANAGE = "config:manage"

    # Student profile
    STUDENT_VIEW_PROFILE = "student:view_profile"


ROLE_PERMISSIONS: Dict[str, List[Permission]] = {
    "admin": [
        # Admin has ALL permissions
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_BULK_IMPORT,
        Permission.DEPARTMENT_MANAGE,
        Permission.SECTION_MANAGE,
        Permission.ATTENDANCE_MARK,
        Permission.ATTENDANCE_EDIT,
        Permission.ATTENDANCE_VIEW,
        Permission.MARKS_ENTER,
        Permission.MARKS_EDIT,
        Permission.MARKS_VIEW,
        Permission.ANNOUNCEMENT_CREATE,
        Permission.ANNOUNCEMENT_VIEW,
        Permission.FEE_VIEW,
        Permission.FEE_MANAGE,
        Permission.TIMETABLE_MANAGE,
        Permission.TIMETABLE_VIEW,
        Permission.REPORT_VIEW_ALL,
        Permission.CONFIG_MANAGE,
        Permission.STUDENT_VIEW_PROFILE,
    ],
    "faculty": [
        Permission.ATTENDANCE_MARK,
        Permission.ATTENDANCE_EDIT,
        Permission.ATTENDANCE_VIEW,
        Permission.MARKS_ENTER,
        Permission.MARKS_EDIT,
        Permission.MARKS_VIEW,
        Permission.ANNOUNCEMENT_CREATE,
        Permission.ANNOUNCEMENT_VIEW,
        Permission.TIMETABLE_VIEW,
        Permission.STUDENT_VIEW_PROFILE,
    ],
    "student": [
        Permission.ATTENDANCE_VIEW,   # own only
        Permission.MARKS_VIEW,        # own only
        Permission.ANNOUNCEMENT_VIEW,
        Permission.FEE_VIEW,          # own only
        Permission.TIMETABLE_VIEW,
        Permission.STUDENT_VIEW_PROFILE,  # own only
    ],
}


def has_permission(role: str, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def has_all_permissions(role: str, permissions: List[Permission]) -> bool:
    """Check if a role has all specified permissions."""
    role_perms = ROLE_PERMISSIONS.get(role, [])
    return all(p in role_perms for p in permissions)
```

---

## 4. Step 3: Security Utilities

```python
# app/core/security.py

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_COST,
)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with configured cost factor."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Sign a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def generate_refresh_token() -> str:
    """Generate a cryptographically secure random refresh token (64 hex chars)."""
    return secrets.token_hex(32)


def hash_refresh_token(token: str) -> str:
    """SHA-256 hash a refresh token for database storage."""
    return hashlib.sha256(token.encode()).hexdigest()
```

---

## 5. Step 4: Auth Dependencies

### 5.1 require_auth — JWT Verification

```python
# app/dependencies/auth.py

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
```

### 5.2 require_section_access — Faculty Scoping

```python
# app/dependencies/department_access.py

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
```

### 5.3 require_self_access — Student Self-Check

```python
# app/dependencies/self_access.py

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
```

---

## 6. Step 5: Pydantic Schemas

See `06-api-specification.md` § 8 for the complete DTO reference. Create each schema file:

```python
# app/schemas/auth.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    last_login_at: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}
```

```python
# app/schemas/user.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    role: Literal["admin", "faculty", "student"]
    # Student-specific
    usn: Optional[str] = Field(None, pattern=r"^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$")
    department_id: Optional[str] = None
    section_id: Optional[str] = None
    current_semester: Optional[int] = Field(None, ge=1, le=8)
    academic_year: Optional[str] = None
    # Faculty-specific
    employee_id: Optional[str] = None


class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)
```

Additional schemas for departments, sections, and assignments follow the same pattern from `06-api-specification.md`.

---

## 7. Step 6: Auth Router

```python
# app/routers/auth.py

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.core.security import (
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import LoginRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and issue JWT + refresh token cookies."""
    # Find user by email
    user = db.query(User).filter(User.email == body.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled. Contact your administrator.")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate tokens
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    raw_refresh_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh_token)

    # Store refresh token hash in DB
    refresh_token_row = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
    )
    db.add(refresh_token_row)

    # Update last_login_at
    user.last_login_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return user


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Revoke refresh token and clear cookies."""
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        token_hash = hash_refresh_token(raw_token)
        token_row = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at == None,
        ).first()
        if token_row:
            token_row.revoked_at = datetime.now(timezone.utc).isoformat()
            db.commit()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return Response(status_code=204)


@router.post("/refresh", response_model=UserResponse)
async def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Rotate refresh token and issue new access token."""
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    token_hash = hash_refresh_token(raw_token)
    token_row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not token_row:
        raise HTTPException(status_code=401, detail="Session invalid. Please log in again.")

    if token_row.revoked_at is not None:
        # Possible token theft — token was already used/revoked
        raise HTTPException(status_code=401, detail="Session invalid. Please log in again.")

    if datetime.fromisoformat(token_row.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    # Revoke old token
    token_row.revoked_at = datetime.now(timezone.utc).isoformat()

    # Load user
    user = db.query(User).filter(User.id == token_row.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Issue new tokens
    new_access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    new_raw_refresh = generate_refresh_token()
    new_token_hash = hash_refresh_token(new_raw_refresh)

    new_token_row = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
    )
    db.add(new_token_row)
    db.commit()

    response.set_cookie(
        key="access_token", value=new_access_token, httponly=True,
        secure=settings.COOKIE_SECURE, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token", value=new_raw_refresh, httponly=True,
        secure=settings.COOKIE_SECURE, samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user
```

---

## 8. Step 7: Users Router

```python
# app/routers/users.py

import csv
import io
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.core.security import hash_password
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.faculty_profile import FacultyProfile
from app.models.refresh_token import RefreshToken
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
    # Check duplicate email
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    # Create user
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        is_active=True,
    )
    db.add(user)
    db.flush()  # Get user.id

    # Create role-specific profile
    if body.role == "student":
        if not all([body.usn, body.department_id, body.section_id, body.current_semester]):
            raise HTTPException(status_code=422, detail="Student requires: usn, department_id, section_id, current_semester")

        # Check duplicate USN
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
        # Revoke all tokens if deactivating
        if not body.is_active:
            _revoke_all_tokens(db, user.id)

    db.commit()
    db.refresh(user)
    return user


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

    for i, row in enumerate(reader, start=2):  # Row 1 is header
        try:
            # Check duplicate email
            if db.query(User).filter(User.email == row["email"]).first():
                skipped += 1
                continue

            # Generate temp password
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
            # ... (lookup by code, create profile)

            credentials.append({"name": row["name"], "email": row["email"], "password": temp_password})
            imported += 1

        except Exception as e:
            errors.append({"row": i, "reason": str(e)})

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
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
```

---

## 9. Step 8: Department & Section Routers

```python
# app/routers/departments.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_role
from app.models.department import Department
from app.models.section import Section
from app.models.user import User
from app.schemas.department import CreateDepartmentRequest, UpdateDepartmentRequest

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("")
async def list_departments(
    count: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if count:
        return {"count": db.query(Department).count()}
    departments = db.query(Department).all()
    return {"items": departments}


@router.post("", status_code=201)
async def create_department(
    body: CreateDepartmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    existing = db.query(Department).filter(Department.code == body.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Department code already exists.")

    dept = Department(code=body.code, name=body.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/{dept_id}")
async def get_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.patch("/{dept_id}")
async def update_department(
    dept_id: str,
    body: UpdateDepartmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if body.name:
        dept.name = body.name
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=204)
async def delete_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if dept.sections:
        raise HTTPException(status_code=409, detail="Cannot delete department with existing sections, students, or faculty.")
    db.delete(dept)
    db.commit()
```

```python
# app/routers/sections.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_role
from app.models.section import Section
from app.models.user import User
from app.schemas.section import CreateSectionRequest

router = APIRouter(tags=["sections"])


@router.get("/api/departments/{dept_id}/sections")
async def list_sections(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    sections = db.query(Section).filter(Section.department_id == dept_id).all()
    return {"items": sections}


@router.post("/api/departments/{dept_id}/sections", status_code=201)
async def create_section(
    dept_id: str,
    body: CreateSectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    existing = db.query(Section).filter(
        Section.department_id == dept_id,
        Section.semester == body.semester,
        Section.name == body.name,
        Section.academic_year == body.academic_year,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Section already exists for this department, semester, and academic year.")

    section = Section(
        department_id=dept_id,
        name=body.name,
        semester=body.semester,
        academic_year=body.academic_year,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.delete("/api/sections/{section_id}", status_code=204)
async def delete_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()
```

---

## 10. Step 9: Faculty Assignment Router

```python
# app/routers/assignments.py

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.models.faculty_section_assignment import FacultySectionAssignment
from app.models.section import Section
from app.schemas.assignment import CreateAssignmentRequest

router = APIRouter(prefix="/api/faculty-assignments", tags=["assignments"])


@router.get("")
async def list_assignments(
    faculty_id: Optional[str] = None,
    section_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    query = db.query(FacultySectionAssignment)
    if faculty_id:
        query = query.filter(FacultySectionAssignment.faculty_id == faculty_id)
    if section_id:
        query = query.filter(FacultySectionAssignment.section_id == section_id)
    return {"items": query.all()}


@router.post("", status_code=201)
async def create_assignment(
    body: CreateAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    # Verify faculty exists and has faculty role
    faculty = db.query(User).filter(User.id == body.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found.")
    if faculty.role != "faculty":
        raise HTTPException(status_code=422, detail="User must have faculty role.")

    # Verify section exists
    section = db.query(Section).filter(Section.id == body.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found.")

    # Check duplicate
    existing = db.query(FacultySectionAssignment).filter(
        FacultySectionAssignment.faculty_id == body.faculty_id,
        FacultySectionAssignment.section_id == body.section_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Faculty is already assigned to this section.")

    assignment = FacultySectionAssignment(
        faculty_id=body.faculty_id,
        section_id=body.section_id,
        subject=body.subject,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}", status_code=204)
async def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    assignment = db.query(FacultySectionAssignment).filter(
        FacultySectionAssignment.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()


# Faculty-facing endpoint
faculty_router = APIRouter(prefix="/api/faculty", tags=["faculty"])


@faculty_router.get("/me/sections")
async def my_sections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get sections assigned to the current faculty member."""
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="This endpoint is for faculty only")

    assignments = db.query(FacultySectionAssignment).filter(
        FacultySectionAssignment.faculty_id == current_user.id
    ).all()
    return {"items": assignments}
```

---

## 11. Step 10: Apply Auth to Existing Routers

For any existing routers (e.g., future attendance, marks routers), add the auth dependencies:

```python
# Example: protecting an existing attendance router

from app.dependencies.auth import get_current_user, require_permissions
from app.dependencies.department_access import require_section_access
from app.core.permissions import Permission


@router.post("/api/sections/{section_id}/attendance")
async def mark_attendance(
    section_id: str,
    # ... body parameters ...
    current_user: User = Depends(require_permissions(Permission.ATTENDANCE_MARK)),
    _section_check: User = Depends(require_section_access),
    db: Session = Depends(get_db),
):
    """Mark attendance for a section. Faculty (assigned) or Admin only."""
    # ... handler logic ...
```

---

## 12. Step 11: Update main.py

```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, departments, sections, assignments

app = FastAPI(
    title="CEC Student Digital Platform",
    description="Student Lifecycle Management API",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,  # Required for cookie-based auth
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok", "auth_enabled": settings.AUTH_ENABLED}

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(sections.router)
app.include_router(assignments.router)
app.include_router(assignments.faculty_router)
```

---

## 13. Step 12: Rate Limiting

```python
# Add to app/main.py

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Apply to login endpoint:

```python
# In app/routers/auth.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    # ... existing login logic ...
```

---

## 14. Implementation Order & Dependencies

```
Step 1:  Database models + Alembic migration
            |
Step 2:  Permission map (core/permissions.py)
            |
Step 3:  Security utilities (core/security.py)
            |
Step 4:  Auth dependencies (dependencies/auth.py, department_access.py, self_access.py)
            |
Step 5:  Pydantic schemas (schemas/*)
            |
        +---+---+
        |       |
Step 6: Auth   Step 7: Users
router         router
        |       |
        +---+---+
            |
Step 8:  Department + Section routers
            |
Step 9:  Faculty assignment router
            |
Step 10: Apply auth to existing routers
            |
Step 11: Update main.py (register all routers, CORS, health check)
            |
Step 12: Rate limiting
            |
Step 13: Run seed script + verify
```

### Verification Checklist

After completing all steps:

- [ ] `alembic upgrade head` runs without error.
- [ ] `python -m app.seed` creates admin user.
- [ ] `POST /api/auth/login` returns 200 + cookies.
- [ ] `GET /api/auth/me` returns authenticated user.
- [ ] `POST /api/auth/logout` clears cookies.
- [ ] `GET /api/users` returns 403 for non-admin.
- [ ] `GET /api/users` returns user list for admin.
- [ ] Rate limiting blocks after 5 login attempts.
- [ ] `AUTH_ENABLED=false` bypasses all auth checks.
