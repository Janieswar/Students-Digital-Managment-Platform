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
