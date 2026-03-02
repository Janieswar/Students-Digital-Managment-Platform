# RBAC — Database Schema

## Iteration: RBAC | SQLite + SQLAlchemy + Alembic

---

## Table of Contents

1. [Schema Change Summary](#1-schema-change-summary)
2. [Enum Definitions](#2-enum-definitions)
3. [Table: users](#3-table-users)
4. [Table: refresh_tokens](#4-table-refresh_tokens)
5. [Table: departments](#5-table-departments)
6. [Table: sections](#6-table-sections)
7. [Table: student_profiles](#7-table-student_profiles)
8. [Table: faculty_profiles](#8-table-faculty_profiles)
9. [Table: faculty_section_assignments](#9-table-faculty_section_assignments)
10. [SQLAlchemy Model Definitions](#10-sqlalchemy-model-definitions)
11. [Migration Plan](#11-migration-plan)
12. [Seed Script Specification](#12-seed-script-specification)

---

## 1. Schema Change Summary

| Change Type | Object | Purpose |
|-------------|--------|---------|
| NEW TABLE | `users` | Core user accounts (all roles) |
| NEW TABLE | `refresh_tokens` | JWT refresh token hashes for session management |
| NEW TABLE | `departments` | Engineering departments at CEC |
| NEW TABLE | `sections` | Semester/section subdivisions within departments |
| NEW TABLE | `student_profiles` | Student-specific data (USN, semester, section) |
| NEW TABLE | `faculty_profiles` | Faculty-specific data (employee ID, department) |
| NEW TABLE | `faculty_section_assignments` | Faculty-to-section teaching assignments |

**Total new tables:** 7
**Tables modified:** 0 (greenfield)
**Estimated migration time:** < 1 second (empty database)

---

## 2. Enum Definitions

SQLite does not support native enum types. Enums are enforced at the application layer via SQLAlchemy validators and CHECK constraints.

### UserRole

```python
class UserRole(str, Enum):
    admin = "admin"
    faculty = "faculty"
    student = "student"
```

**Values:** `admin`, `faculty`, `student`
**Default:** None (required on creation)
**Future additions:** `hod`, `principal`, `parent` (Phase 2+)

**CHECK constraint:**
```sql
CHECK (role IN ('admin', 'faculty', 'student'))
```

---

## 3. Table: `users`

Core user account table. All roles share this table; role-specific data is in profile tables.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `email` | TEXT | No | — | Login identifier. Unique. |
| `password_hash` | TEXT | No | — | bcrypt hash (cost 12). **Excluded from all API responses.** |
| `name` | TEXT | No | — | Display name |
| `role` | TEXT | No | — | One of: `admin`, `faculty`, `student` |
| `is_active` | INTEGER (bool) | No | `1` | Soft-delete / disable flag. `0` = cannot log in. |
| `last_login_at` | TEXT (ISO 8601) | Yes | `NULL` | Updated on successful login |
| `created_at` | TEXT (ISO 8601) | No | `now()` | Creation timestamp |
| `updated_at` | TEXT (ISO 8601) | No | `now()` | Auto-updated on every write |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_users_email` | `email` | Yes | Login lookup + uniqueness |
| `ix_users_role` | `role` | No | Filtering users by role |
| `ix_users_is_active` | `is_active` | No | Filtering active/inactive |

### Business Rules

1. `email` must be globally unique (enforced by unique index).
2. `password_hash` is NEVER included in any API response or log output.
3. `is_active = 0` prevents login but does NOT delete the row (soft delete).
4. `updated_at` is set to `now()` on every UPDATE via application logic.
5. `role` is immutable after creation in Phase 1 (admin must create a new user to change roles).

---

## 4. Table: `refresh_tokens`

Stores hashed refresh tokens for session management and token rotation.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `user_id` | TEXT (UUID) | No | — | FK -> `users.id` |
| `token_hash` | TEXT | No | — | SHA-256 hash of the raw refresh token |
| `expires_at` | TEXT (ISO 8601) | No | — | Token expiry (login time + 7 days) |
| `revoked_at` | TEXT (ISO 8601) | Yes | `NULL` | Set on logout or token rotation |
| `created_at` | TEXT (ISO 8601) | No | `now()` | When token was issued |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_refresh_tokens_token_hash` | `token_hash` | Yes | Fast lookup during refresh |
| `ix_refresh_tokens_user_id` | `user_id` | No | Revoking all tokens for a user |

### Business Rules

1. Raw refresh token is NEVER stored. Only the SHA-256 hash is persisted.
2. On token refresh: old token gets `revoked_at = now()`, new token row is created (rotation).
3. On logout: current token gets `revoked_at = now()`.
4. On user deactivation: all tokens for that user get `revoked_at = now()`.
5. A cleanup job (future) should delete rows where `expires_at < now() - 30 days`.

---

## 5. Table: `departments`

Engineering departments at CEC.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `code` | TEXT | No | — | Short identifier (e.g., `CSE`, `ISE`). Unique. |
| `name` | TEXT | No | — | Full name (e.g., "Computer Science and Engineering") |
| `created_at` | TEXT (ISO 8601) | No | `now()` | Creation timestamp |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_departments_code` | `code` | Yes | Fast lookup + uniqueness |

### Business Rules

1. `code` must be 2-5 uppercase letters (enforced at application layer).
2. A department cannot be deleted if it has associated sections, students, or faculty.
3. Typical seed data: CSE, ISE, ECE, EEE, ME, CE, AIML, MBA.

---

## 6. Table: `sections`

Semester/section subdivisions within departments. E.g., "CSE 3rd Semester Section A".

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `department_id` | TEXT (UUID) | No | — | FK -> `departments.id` |
| `name` | TEXT | No | — | Section identifier (e.g., `A`, `B`) |
| `semester` | INTEGER | No | — | Semester number (1-8) |
| `academic_year` | TEXT | No | — | Academic year (e.g., `2025-26`) |
| `created_at` | TEXT (ISO 8601) | No | `now()` | Creation timestamp |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_sections_dept_sem_name_year` | `department_id, semester, name, academic_year` | Yes | Uniqueness within department |
| `ix_sections_department_id` | `department_id` | No | Foreign key lookup |

### Business Rules

1. Combination of `(department_id, semester, name, academic_year)` must be unique.
2. `semester` must be between 1 and 8 inclusive.
3. A section cannot be deleted if it has enrolled students or faculty assignments.

---

## 7. Table: `student_profiles`

Student-specific data linked to the `users` table. One-to-one relationship with `users` where `role = 'student'`.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `user_id` | TEXT (UUID) | No | — | FK -> `users.id`. Unique. |
| `usn` | TEXT | No | — | VTU University Seat Number. Unique. |
| `department_id` | TEXT (UUID) | No | — | FK -> `departments.id` |
| `section_id` | TEXT (UUID) | No | — | FK -> `sections.id` |
| `current_semester` | INTEGER | No | — | Current semester (1-8) |
| `academic_year` | TEXT | No | — | Academic year (e.g., `2025-26`) |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_student_profiles_user_id` | `user_id` | Yes | One-to-one with users |
| `ix_student_profiles_usn` | `usn` | Yes | USN uniqueness |
| `ix_student_profiles_section_id` | `section_id` | No | Section-level queries |
| `ix_student_profiles_department_id` | `department_id` | No | Department-level queries |

### Business Rules

1. One `student_profiles` row per `users` row where `role = 'student'`.
2. USN format: `^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$` (e.g., `1CG21CS001`).
3. `current_semester` should match the `semester` of the linked section.
4. `section_id` must reference a section in the same department as `department_id`.

---

## 8. Table: `faculty_profiles`

Faculty-specific data linked to the `users` table. One-to-one relationship with `users` where `role = 'faculty'`.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `user_id` | TEXT (UUID) | No | — | FK -> `users.id`. Unique. |
| `employee_id` | TEXT | No | — | CEC employee identifier. Unique. |
| `department_id` | TEXT (UUID) | No | — | FK -> `departments.id` (home department) |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_faculty_profiles_user_id` | `user_id` | Yes | One-to-one with users |
| `ix_faculty_profiles_employee_id` | `employee_id` | Yes | Employee ID uniqueness |
| `ix_faculty_profiles_department_id` | `department_id` | No | Department-level queries |

### Business Rules

1. One `faculty_profiles` row per `users` row where `role = 'faculty'`.
2. `department_id` is the faculty member's "home" department, but they can be assigned to sections in other departments via `faculty_section_assignments`.
3. `employee_id` is a CEC-internal identifier, not the same as VTU registration.

---

## 9. Table: `faculty_section_assignments`

Maps faculty members to sections they teach. A faculty member can be assigned to multiple sections (possibly across departments). A section can have multiple faculty members (different subjects).

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT (UUID) | No | `uuid4()` | Primary key |
| `faculty_id` | TEXT (UUID) | No | — | FK -> `users.id` (must have `role = 'faculty'`) |
| `section_id` | TEXT (UUID) | No | — | FK -> `sections.id` |
| `subject` | TEXT | Yes | `NULL` | Optional: subject being taught |
| `assigned_at` | TEXT (ISO 8601) | No | `now()` | When the assignment was created |

### Indexes

| Name | Columns | Unique | Purpose |
|------|---------|--------|---------|
| `ix_fsa_faculty_section` | `faculty_id, section_id` | Yes | One assignment per faculty-section pair |
| `ix_fsa_section_id` | `section_id` | No | Get all faculty for a section |
| `ix_fsa_faculty_id` | `faculty_id` | No | Get all sections for a faculty member |

### Business Rules

1. `faculty_id` must reference a user with `role = 'faculty'`.
2. A faculty member can be assigned to sections in any department (cross-department is allowed).
3. The unique constraint `(faculty_id, section_id)` prevents duplicate assignments.
4. Deleting an assignment immediately removes the faculty member's access to that section's data.

---

## 10. SQLAlchemy Model Definitions

```python
# app/models/user.py

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Integer, Boolean, DateTime, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, PyEnum):
    admin = "admin"
    faculty = "faculty"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat(),
                        onupdate=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False)
    faculty_assignments = relationship("FacultySectionAssignment", back_populates="faculty")

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'faculty', 'student')", name="ck_users_role"),
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )
```

```python
# app/models/refresh_token.py

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    expires_at = Column(String, nullable=False)
    revoked_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("ix_refresh_tokens_user_id", "user_id"),
    )
```

```python
# app/models/department.py

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    sections = relationship("Section", back_populates="department", cascade="all, delete-orphan")
    student_profiles = relationship("StudentProfile", back_populates="department")
    faculty_profiles = relationship("FacultyProfile", back_populates="department")
```

```python
# app/models/section.py

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    created_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    department = relationship("Department", back_populates="sections")
    student_profiles = relationship("StudentProfile", back_populates="section")
    faculty_assignments = relationship("FacultySectionAssignment", back_populates="section")

    __table_args__ = (
        UniqueConstraint("department_id", "semester", "name", "academic_year",
                         name="uq_sections_dept_sem_name_year"),
        Index("ix_sections_department_id", "department_id"),
    )
```

```python
# app/models/student_profile.py

import uuid

from sqlalchemy import Column, String, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    usn = Column(String, nullable=False, unique=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)
    section_id = Column(String, ForeignKey("sections.id"), nullable=False)
    current_semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="student_profiles")
    section = relationship("Section", back_populates="student_profiles")

    __table_args__ = (
        Index("ix_student_profiles_section_id", "section_id"),
        Index("ix_student_profiles_department_id", "department_id"),
    )
```

```python
# app/models/faculty_profile.py

import uuid

from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    employee_id = Column(String, nullable=False, unique=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)

    # Relationships
    user = relationship("User", back_populates="faculty_profile")
    department = relationship("Department", back_populates="faculty_profiles")

    __table_args__ = (
        Index("ix_faculty_profiles_department_id", "department_id"),
    )
```

```python
# app/models/faculty_section_assignment.py

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base


class FacultySectionAssignment(Base):
    __tablename__ = "faculty_section_assignments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(String, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String, nullable=True)
    assigned_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    faculty = relationship("User", back_populates="faculty_assignments")
    section = relationship("Section", back_populates="faculty_assignments")

    __table_args__ = (
        UniqueConstraint("faculty_id", "section_id", name="uq_fsa_faculty_section"),
        Index("ix_fsa_section_id", "section_id"),
        Index("ix_fsa_faculty_id", "faculty_id"),
    )
```

---

## 11. Migration Plan

### Alembic Migration File

```
alembic revision --autogenerate -m "add_rbac_tables"
```

### Migration Order (dependencies)

```
1. departments             (no FK dependencies)
2. users                   (no FK dependencies)
3. sections                (depends on departments)
4. refresh_tokens          (depends on users)
5. student_profiles        (depends on users, departments, sections)
6. faculty_profiles        (depends on users, departments)
7. faculty_section_assignments (depends on users, sections)
```

### Rollback

```
alembic downgrade -1
```

This drops all 7 tables in reverse order.

### Pre-migration Checklist

- [ ] Backup the existing database (even if empty).
- [ ] Verify Alembic `env.py` targets the correct database URL.
- [ ] Run migration on a test database first.
- [ ] Verify all 7 tables exist after migration: `SELECT name FROM sqlite_master WHERE type='table';`

---

## 12. Seed Script Specification

### Purpose

Create the first `admin` user so the platform can be bootstrapped. Without this, nobody can log in.

### Script: `app/seed.py`

```python
"""
Seed script: creates the initial admin user.

Usage:
    python -m app.seed

Environment variables:
    SEED_ADMIN_EMAIL    (default: admin@cec.edu.in)
    SEED_ADMIN_PASSWORD (required)
"""

import os
import sys
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


def seed():
    email = os.getenv("SEED_ADMIN_EMAIL", "admin@cec.edu.in")
    password = os.getenv("SEED_ADMIN_PASSWORD")

    if not password:
        print("ERROR: SEED_ADMIN_PASSWORD environment variable is required.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.admin).first()
        if existing:
            print(f"Admin user already exists: {existing.email}. Skipping.")
            return

        admin = User(
            email=email,
            password_hash=hash_password(password),
            name="CEC Admin",
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
```

### Seed Data — Departments (optional)

After admin creation, admin can create departments via the API. Optionally, the seed script can also create standard CEC departments:

```python
DEPARTMENTS = [
    ("CSE", "Computer Science and Engineering"),
    ("ISE", "Information Science and Engineering"),
    ("ECE", "Electronics and Communication Engineering"),
    ("EEE", "Electrical and Electronics Engineering"),
    ("ME", "Mechanical Engineering"),
    ("CE", "Civil Engineering"),
    ("AIML", "Artificial Intelligence and Machine Learning"),
    ("MBA", "Master of Business Administration"),
]
```
