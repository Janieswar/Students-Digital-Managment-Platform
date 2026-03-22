from pydantic import BaseModel, Field
from typing import Optional


class AssignmentCreate(BaseModel):
    faculty_id: str
    section_id: str
    subject: Optional[str] = Field(None, max_length=100)


class FacultyShortResponse(BaseModel):
    id: str
    name: str
    email: str

    model_config = {"from_attributes": True}

class SectionShortResponse(BaseModel):
    id: str
    name: str
    semester: int
    academic_year: str
    department_code: Optional[str] = None

    model_config = {"from_attributes": True}


class AssignmentResponse(BaseModel):
    id: str
    faculty: FacultyShortResponse
    section: SectionShortResponse
    subject: Optional[str] = None
    assigned_at: str

    model_config = {"from_attributes": True}
