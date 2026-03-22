import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    faculty_count = Column(Integer, nullable=False, default=0)
    student_count = Column(Integer, nullable=False, default=0)
    created_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    sections = relationship("Section", back_populates="department", cascade="all, delete-orphan")
    student_profiles = relationship("StudentProfile", back_populates="department")
    faculty_profiles = relationship("FacultyProfile", back_populates="department")
