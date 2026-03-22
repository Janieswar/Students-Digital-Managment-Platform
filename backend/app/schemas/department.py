from pydantic import BaseModel, Field
from typing import Optional


class DepartmentCreate(BaseModel):
    code: str = Field(min_length=2, max_length=10)
    name: str = Field(min_length=2, max_length=100)
    faculty_count: Optional[int] = 0
    student_count: Optional[int] = 0


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=10)
    faculty_count: Optional[int] = None
    student_count: Optional[int] = None


class DepartmentResponse(BaseModel):
    id: str
    code: str
    name: str
    created_at: str
    faculty_count: int
    student_count: int
    section_count: Optional[int] = 0

    model_config = {"from_attributes": True}
