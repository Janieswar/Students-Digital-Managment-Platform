# RBAC — API Specification

## Iteration: RBAC | FastAPI REST API

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Auth Endpoints](#2-auth-endpoints)
3. [User Management Endpoints](#3-user-management-endpoints)
4. [Department Endpoints](#4-department-endpoints)
5. [Section Endpoints](#5-section-endpoints)
6. [Faculty Assignment Endpoints](#6-faculty-assignment-endpoints)
7. [Error Reference](#7-error-reference)
8. [DTO / Schema Reference](#8-dto--schema-reference)

---

## 1. Conventions

### Base URL

```
/api
```

All endpoints are prefixed with `/api`.

### Authentication

- **Method:** httpOnly cookie (`access_token`)
- **Token type:** JWT (HS256)
- **Token lifetime:** 15 minutes
- All endpoints except `POST /api/auth/login` and `GET /api/health` require authentication.
- When `AUTH_ENABLED=false`, auth middleware is bypassed (development/cutover mode).

### Content Type

- All requests and responses use `application/json` unless noted (e.g., CSV upload).
- File uploads use `multipart/form-data`.

### Standard Error Response Shape

```json
{
  "detail": "Human-readable error message"
}
```

For validation errors (422):

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### Pagination

List endpoints support:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `page_size` | integer | 25 | Items per page (max 100) |
| `search` | string | — | Search filter (name, email) |
| `sort_by` | string | `created_at` | Sort field |
| `sort_order` | string | `desc` | `asc` or `desc` |

Response includes pagination metadata:

```json
{
  "items": [...],
  "total": 1325,
  "page": 1,
  "page_size": 25,
  "total_pages": 53
}
```

---

## 2. Auth Endpoints

### 2.1 POST /api/auth/login

**Description:** Authenticate user and issue tokens.
**Auth:** None (public)
**Rate limit:** 5 requests per 60 seconds per IP

**Request Body:**

```json
{
  "email": "admin@cec.edu.in",
  "password": "Admin@123"
}
```

**Success Response (200):**

```json
{
  "id": "uuid",
  "email": "admin@cec.edu.in",
  "name": "CEC Admin",
  "role": "admin",
  "is_active": true,
  "last_login_at": "2025-01-28T10:00:00Z"
}
```

**Cookies Set:**

| Cookie | Value | httpOnly | Secure | SameSite | Max-Age |
|--------|-------|----------|--------|----------|---------|
| `access_token` | JWT string | Yes | Yes (prod) | Lax | 900 (15 min) |
| `refresh_token` | Random token | Yes | Yes (prod) | Lax | 604800 (7 days) |

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | Wrong email/password | `{ "detail": "Invalid credentials" }` |
| 401 | Account inactive | `{ "detail": "Account is disabled. Contact your administrator." }` |
| 422 | Missing fields | Validation error array |
| 429 | Rate limit exceeded | `{ "detail": "Too many login attempts. Try again later.", "retry_after": 60 }` |

---

### 2.2 POST /api/auth/logout

**Description:** Invalidate current session.
**Auth:** Required (any role)

**Request Body:** None

**Success Response (204):** No content

**Cookies Cleared:** `access_token`, `refresh_token` (set with `max_age=0`)

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | Not authenticated | `{ "detail": "Not authenticated" }` |

---

### 2.3 POST /api/auth/refresh

**Description:** Refresh the access token using the refresh token cookie.
**Auth:** Refresh token cookie (not access token)

**Request Body:** None (uses cookie)

**Success Response (200):**

```json
{
  "id": "uuid",
  "email": "admin@cec.edu.in",
  "name": "CEC Admin",
  "role": "admin"
}
```

**Cookies Set:** New `access_token` (15 min) and new `refresh_token` (7 days) — rotation.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | Token expired | `{ "detail": "Session expired. Please log in again." }` |
| 401 | Token revoked/invalid | `{ "detail": "Session invalid. Please log in again." }` |

---

### 2.4 GET /api/auth/me

**Description:** Get the current authenticated user's profile.
**Auth:** Required (any role)

**Success Response (200):**

```json
{
  "id": "uuid",
  "email": "admin@cec.edu.in",
  "name": "CEC Admin",
  "role": "admin",
  "is_active": true,
  "department_id": null,
  "last_login_at": "2025-01-28T10:00:00Z",
  "created_at": "2025-01-01T00:00:00Z"
}
```

For students, additionally includes:

```json
{
  "student_profile": {
    "usn": "1CG21CS001",
    "department": { "id": "uuid", "code": "CSE", "name": "Computer Science and Engineering" },
    "section": { "id": "uuid", "name": "A", "semester": 3 },
    "current_semester": 3,
    "academic_year": "2025-26"
  }
}
```

For faculty, additionally includes:

```json
{
  "faculty_profile": {
    "employee_id": "CEC-F-001",
    "department": { "id": "uuid", "code": "CSE", "name": "Computer Science and Engineering" },
    "assigned_sections": [
      { "section_id": "uuid", "name": "A", "semester": 3, "department_code": "CSE", "subject": "Data Structures" }
    ]
  }
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | Not authenticated | `{ "detail": "Not authenticated" }` |

---

## 3. User Management Endpoints

### 3.1 GET /api/users

**Description:** List all users with pagination and filtering.
**Auth:** `admin` only

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role (`admin`, `faculty`, `student`) |
| `is_active` | boolean | Filter by active status |
| `department_id` | string | Filter by department (students and faculty) |
| `search` | string | Search by name or email |
| `count` | boolean | If true, return only count (for dashboard stats) |
| `page` | integer | Page number |
| `page_size` | integer | Items per page |

**Success Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "email": "rahul@cec.edu.in",
      "name": "Rahul Sharma",
      "role": "student",
      "is_active": true,
      "department": { "id": "uuid", "code": "CSE" },
      "last_login_at": "2025-01-28T10:00:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1325,
  "page": 1,
  "page_size": 25,
  "total_pages": 53
}
```

If `count=true`:

```json
{ "count": 1325 }
```

---

### 3.2 POST /api/users

**Description:** Create a single user.
**Auth:** `admin` only

**Request Body (admin/basic):**

```json
{
  "email": "newadmin@cec.edu.in",
  "password": "TempPass@1",
  "name": "New Admin",
  "role": "admin"
}
```

**Request Body (student):**

```json
{
  "email": "rahul@cec.edu.in",
  "password": "TempPass@1",
  "name": "Rahul Sharma",
  "role": "student",
  "usn": "1CG21CS001",
  "department_id": "uuid",
  "section_id": "uuid",
  "current_semester": 3,
  "academic_year": "2025-26"
}
```

**Request Body (faculty):**

```json
{
  "email": "ram@cec.edu.in",
  "password": "TempPass@1",
  "name": "Dr. Ramesh Kumar",
  "role": "faculty",
  "employee_id": "CEC-F-001",
  "department_id": "uuid"
}
```

**Success Response (201):**

```json
{
  "id": "uuid",
  "email": "rahul@cec.edu.in",
  "name": "Rahul Sharma",
  "role": "student",
  "is_active": true,
  "created_at": "2025-01-28T10:00:00Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 403 | Non-admin | `{ "detail": "Insufficient permissions" }` |
| 409 | Duplicate email | `{ "detail": "A user with this email already exists." }` |
| 409 | Duplicate USN | `{ "detail": "A student with this USN already exists." }` |
| 422 | Validation error | Validation error array |

---

### 3.3 GET /api/users/{user_id}

**Description:** Get user details.
**Auth:** `admin` only

**Success Response (200):** Full user object including profile.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 403 | Non-admin | `{ "detail": "Insufficient permissions" }` |
| 404 | Not found | `{ "detail": "User not found" }` |

---

### 3.4 PATCH /api/users/{user_id}

**Description:** Update user fields.
**Auth:** `admin` only

**Request Body (partial):**

```json
{
  "name": "Updated Name",
  "is_active": false
}
```

**Success Response (200):** Updated user object.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 403 | Non-admin | `{ "detail": "Insufficient permissions" }` |
| 404 | Not found | `{ "detail": "User not found" }` |
| 409 | Email conflict | `{ "detail": "A user with this email already exists." }` |

**Side Effects:**
- Setting `is_active = false` revokes all refresh tokens for the user.

---

### 3.5 PATCH /api/users/{user_id}/reset-password

**Description:** Reset a user's password.
**Auth:** `admin` only

**Request Body:**

```json
{
  "new_password": "NewTemp@123"
}
```

**Success Response (200):**

```json
{ "message": "Password reset successfully" }
```

**Side Effects:**
- User's `password_hash` is updated.
- All refresh tokens for the user are revoked.
- User must log in with the new password.

---

### 3.6 POST /api/users/bulk-import

**Description:** Bulk import students from CSV.
**Auth:** `admin` only
**Content-Type:** `multipart/form-data`

**Request:** File upload with CSV file.

**CSV Format:**

```csv
name,email,usn,department_code,semester,section
Rahul Sharma,rahul@cec.edu.in,1CG21CS001,CSE,3,A
Priya Patel,priya@cec.edu.in,1CG21CS002,CSE,3,A
```

**Success Response (200):**

```json
{
  "imported": 480,
  "skipped": 5,
  "errors": [
    { "row": 12, "reason": "Invalid USN format: ABC123" },
    { "row": 45, "reason": "Department not found: XYZ" }
  ],
  "credentials_download_token": "temp-token-for-csv-download"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Invalid CSV | `{ "detail": "CSV missing required columns: name, email, usn" }` |
| 403 | Non-admin | `{ "detail": "Insufficient permissions" }` |
| 413 | File too large | `{ "detail": "File size exceeds maximum (5MB)" }` |

---

### 3.7 GET /api/users/bulk-import/credentials/{token}

**Description:** Download the credentials CSV for a recent bulk import.
**Auth:** `admin` only
**Content-Type:** `text/csv`

**Response:** CSV file download with columns: `name, email, temporary_password`

---

## 4. Department Endpoints

### 4.1 GET /api/departments

**Description:** List all departments.
**Auth:** `admin` only (Phase 1). Faculty can view their own department in Phase 2.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | boolean | Return only count |

**Success Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "code": "CSE",
      "name": "Computer Science and Engineering",
      "section_count": 8,
      "faculty_count": 12,
      "student_count": 480,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### 4.2 POST /api/departments

**Description:** Create a department.
**Auth:** `admin` only

**Request Body:**

```json
{
  "code": "CSE",
  "name": "Computer Science and Engineering"
}
```

**Success Response (201):**

```json
{
  "id": "uuid",
  "code": "CSE",
  "name": "Computer Science and Engineering",
  "created_at": "2025-01-28T10:00:00Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 409 | Duplicate code | `{ "detail": "Department code already exists." }` |
| 422 | Validation error | Validation error array |

---

### 4.3 GET /api/departments/{dept_id}

**Description:** Get department details including sections summary.
**Auth:** `admin` only

**Success Response (200):**

```json
{
  "id": "uuid",
  "code": "CSE",
  "name": "Computer Science and Engineering",
  "sections": [
    { "id": "uuid", "name": "A", "semester": 3, "academic_year": "2025-26", "student_count": 60 }
  ],
  "faculty_count": 12,
  "student_count": 480
}
```

---

### 4.4 PATCH /api/departments/{dept_id}

**Description:** Update department name.
**Auth:** `admin` only

**Request Body:**

```json
{ "name": "Computer Science & Engineering" }
```

---

### 4.5 DELETE /api/departments/{dept_id}

**Description:** Delete a department (only if no students/faculty/sections exist).
**Auth:** `admin` only

**Success Response (204):** No content

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 409 | Has dependents | `{ "detail": "Cannot delete department with existing sections, students, or faculty." }` |

---

## 5. Section Endpoints

### 5.1 GET /api/departments/{dept_id}/sections

**Description:** List sections for a department.
**Auth:** `admin` only

**Success Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "A",
      "semester": 3,
      "academic_year": "2025-26",
      "department_id": "uuid",
      "student_count": 60,
      "faculty_count": 4
    }
  ]
}
```

---

### 5.2 POST /api/departments/{dept_id}/sections

**Description:** Create a section within a department.
**Auth:** `admin` only

**Request Body:**

```json
{
  "name": "A",
  "semester": 3,
  "academic_year": "2025-26"
}
```

**Success Response (201):**

```json
{
  "id": "uuid",
  "name": "A",
  "semester": 3,
  "academic_year": "2025-26",
  "department_id": "uuid",
  "created_at": "2025-01-28T10:00:00Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 409 | Duplicate | `{ "detail": "Section already exists for this department, semester, and academic year." }` |

---

### 5.3 DELETE /api/sections/{section_id}

**Description:** Delete a section (only if no students or assignments).
**Auth:** `admin` only

**Success Response (204):** No content

---

## 6. Faculty Assignment Endpoints

### 6.1 GET /api/faculty-assignments

**Description:** List all faculty-section assignments.
**Auth:** `admin` only

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `faculty_id` | string | Filter by faculty member |
| `section_id` | string | Filter by section |
| `department_id` | string | Filter by department |

**Success Response (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "faculty": { "id": "uuid", "name": "Dr. Ramesh Kumar", "email": "ram@cec.edu.in" },
      "section": { "id": "uuid", "name": "A", "semester": 3, "department_code": "CSE" },
      "subject": "Data Structures",
      "assigned_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

### 6.2 POST /api/faculty-assignments

**Description:** Assign a faculty member to a section.
**Auth:** `admin` only

**Request Body:**

```json
{
  "faculty_id": "uuid",
  "section_id": "uuid",
  "subject": "Data Structures"
}
```

**Success Response (201):**

```json
{
  "id": "uuid",
  "faculty_id": "uuid",
  "section_id": "uuid",
  "subject": "Data Structures",
  "assigned_at": "2025-01-28T10:00:00Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 404 | Faculty not found | `{ "detail": "Faculty member not found." }` |
| 404 | Section not found | `{ "detail": "Section not found." }` |
| 409 | Already assigned | `{ "detail": "Faculty is already assigned to this section." }` |
| 422 | User is not faculty | `{ "detail": "User must have faculty role." }` |

---

### 6.3 DELETE /api/faculty-assignments/{assignment_id}

**Description:** Remove a faculty-section assignment.
**Auth:** `admin` only

**Success Response (204):** No content

---

### 6.4 GET /api/faculty/me/sections

**Description:** Get the authenticated faculty member's section assignments.
**Auth:** `faculty` only

**Success Response (200):**

```json
{
  "items": [
    {
      "section_id": "uuid",
      "name": "A",
      "semester": 3,
      "department": { "id": "uuid", "code": "CSE", "name": "Computer Science and Engineering" },
      "subject": "Data Structures",
      "student_count": 60
    }
  ]
}
```

---

## 7. Error Reference

### Standard HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful read/update |
| 201 | Created | Successful resource creation |
| 204 | No Content | Successful deletion, logout |
| 400 | Bad Request | Malformed request body/CSV |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (email, USN, code) |
| 413 | Payload Too Large | File upload exceeds limit |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Error Response Examples

**401 — Not authenticated:**
```json
{ "detail": "Not authenticated" }
```

**403 — Insufficient permissions:**
```json
{ "detail": "Insufficient permissions" }
```

**403 — Section access denied:**
```json
{ "detail": "You are not assigned to this section" }
```

**403 — Self-access denied:**
```json
{ "detail": "You can only access your own records" }
```

**409 — Conflict:**
```json
{ "detail": "A user with this email already exists." }
```

**429 — Rate limited:**
```json
{ "detail": "Too many login attempts. Try again later.", "retry_after": 60 }
```

---

## 8. DTO / Schema Reference

### Pydantic Schemas (Request/Response)

```python
# Auth
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    last_login_at: Optional[str]
    created_at: str

# Users
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    role: Literal["admin", "faculty", "student"]
    # Student-specific (required if role == student)
    usn: Optional[str] = Field(None, pattern=r"^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$")
    department_id: Optional[str] = None
    section_id: Optional[str] = None
    current_semester: Optional[int] = Field(None, ge=1, le=8)
    academic_year: Optional[str] = None
    # Faculty-specific (required if role == faculty)
    employee_id: Optional[str] = None

class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

# Departments
class CreateDepartmentRequest(BaseModel):
    code: str = Field(min_length=2, max_length=5, pattern=r"^[A-Z]+$")
    name: str = Field(min_length=3, max_length=100)

class UpdateDepartmentRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)

# Sections
class CreateSectionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=10)
    semester: int = Field(ge=1, le=8)
    academic_year: str = Field(pattern=r"^\d{4}-\d{2}$")

# Faculty Assignments
class CreateAssignmentRequest(BaseModel):
    faculty_id: str
    section_id: str
    subject: Optional[str] = None

# Pagination
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
```
