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
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    faculty_assignments = relationship("FacultySectionAssignment", back_populates="faculty", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'faculty', 'student')", name="ck_users_role"),
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )
