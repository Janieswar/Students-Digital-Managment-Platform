from pydantic import BaseModel, Field
from typing import Optional


class SectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=10)
    semester: int = Field(ge=1, le=8)
    academic_year: str = Field(min_length=4, max_length=20)


class SectionResponse(BaseModel):
    id: str
    name: str
    semester: int
    academic_year: str
    department_id: str
    created_at: str
    student_count: Optional[int] = 0
    faculty_count: Optional[int] = 0

    model_config = {"from_attributes": True}
