from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    role: Literal["admin", "faculty", "student"]
    # Student-specific
    usn: Optional[str] = Field(None, pattern=r"^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$")
    department_id: Optional[str] = None
    section_id: Optional[str] = None
    current_semester: Optional[int] = Field(None, ge=1, le=8)
    academic_year: Optional[str] = None
    # Faculty-specific
    employee_id: Optional[str] = None


class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)
