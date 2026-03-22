from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_role
from app.models.section import Section
from app.models.user import User
from app.core.audit import log_event
from app.schemas.section import SectionCreate

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
    body: SectionCreate,
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
    
    log_event(
        db=db,
        action="section.create",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="section",
        resource_id=section.id,
        detail=f"Created section {section.name} for department {dept_id}",
        ip_address=None
    )
    
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
    
    if section.student_profiles or section.faculty_assignments:
        raise HTTPException(status_code=409, detail="Cannot delete section with existing students or faculty assignments.")
    
    db.delete(section)
    db.commit()
    
    log_event(
        db=db,
        action="section.delete",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="section",
        resource_id=section_id,
        detail=f"Deleted section: {section_id}",
        ip_address=None
    )
