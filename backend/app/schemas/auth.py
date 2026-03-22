from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class DeptShortResponse(BaseModel):
    id: str
    code: str
    name: str
    model_config = {"from_attributes": True}


class SectionShortResponse(BaseModel):
    id: str
    name: str
    semester: int
    academic_year: str
    model_config = {"from_attributes": True}


class StudentProfileResponse(BaseModel):
    usn: str
    current_semester: int
    academic_year: str
    department: DeptShortResponse
    section: SectionShortResponse
    model_config = {"from_attributes": True}


class FacultyProfileResponse(BaseModel):
    employee_id: str
    department: DeptShortResponse
    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    last_login_at: Optional[str] = None
    created_at: str
    student_profile: Optional[StudentProfileResponse] = None
    faculty_profile: Optional[FacultyProfileResponse] = None

    model_config = {"from_attributes": True}
