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
