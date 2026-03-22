from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_role
from app.models.department import Department
from app.models.user import User
from app.core.audit import log_event
from app.schemas.department import DepartmentCreate, DepartmentUpdate

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
    body: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    existing = db.query(Department).filter(Department.code == body.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Department code already exists.")

    dept = Department(
        code=body.code, 
        name=body.name,
        faculty_count=body.faculty_count,
        student_count=body.student_count
    )
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
    body: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if body.name is not None:
        dept.name = body.name
    if body.code is not None:
        # Check if code already exists in another department
        existing = db.query(Department).filter(Department.code == body.code, Department.id != dept_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Department code already exists.")
        dept.code = body.code
    if body.faculty_count is not None:
        dept.faculty_count = body.faculty_count
    if body.student_count is not None:
        dept.student_count = body.student_count
        
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

    log_event(
        db=db,
        action="department.delete",
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        resource_type="department",
        resource_id=dept_id,
        detail=f"Deleted department: {dept.code}",
        ip_address=None
    )
