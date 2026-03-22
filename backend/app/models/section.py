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
