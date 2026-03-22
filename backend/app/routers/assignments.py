from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.models.faculty_section_assignment import FacultySectionAssignment
from app.models.section import Section
from app.models.department import Department
from sqlalchemy.orm import joinedload
from app.core.audit import log_event
from app.schemas.assignment import AssignmentCreate

router = APIRouter(prefix="/api/faculty-assignments", tags=["assignments"])


@router.get("")
async def list_assignments(
    faculty_id: Optional[str] = None,
    section_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    query = db.query(FacultySectionAssignment).options(
        joinedload(FacultySectionAssignment.section).joinedload(Section.department)
    )
    if faculty_id:
        query = query.filter(FacultySectionAssignment.faculty_id == faculty_id)
    if section_id:
        query = query.filter(FacultySectionAssignment.section_id == section_id)
    
    results = query.all()
    # Map joined data to match the schema if needed, but pydantic with from_attributes 
    # and some clever mapping usually handles this.
    # To be safe, we'll manually map the department_code.
    for r in results:
        r.section.department_code = r.section.department.code
        
    return {"items": results}


@router.post("", status_code=201)
async def create_assignment(
    body: AssignmentCreate,
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
    
    log_event(
        db=db,
        action="assignment.create",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="assignment",
        resource_id=assignment.id,
        detail=f"Assigned faculty {faculty.id} to section {section.id}",
        ip_address=None
    )
    
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
    
    log_event(
        db=db,
        action="assignment.delete",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="assignment",
        resource_id=assignment_id,
        detail=f"Removed faculty assignment: {assignment_id}",
        ip_address=None
    )


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

    assignments = db.query(FacultySectionAssignment).options(
        joinedload(FacultySectionAssignment.section).joinedload(Section.department)
    ).filter(
        FacultySectionAssignment.faculty_id == current_user.id
    ).all()
    
    for a in assignments:
        a.section.department_code = a.section.department.code
        
    return {"items": assignments}
