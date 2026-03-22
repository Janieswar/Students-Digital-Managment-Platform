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
