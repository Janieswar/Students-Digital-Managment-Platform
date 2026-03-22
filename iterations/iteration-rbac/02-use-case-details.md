
# RBAC — Use Case Details

## Iteration: RBAC | Priority: P0

---

## Table of Contents

1. [Use Case Inventory](#1-use-case-inventory)
2. [UC-RBAC-001: User Login](#2-uc-rbac-001-user-login)
3. [UC-RBAC-002: Token Refresh (Silent Re-authentication)](#3-uc-rbac-002-token-refresh)
4. [UC-RBAC-003: User Logout](#4-uc-rbac-003-user-logout)
5. [UC-RBAC-004: Access a Protected Endpoint — Happy Path](#5-uc-rbac-004-access-a-protected-endpoint)
6. [UC-RBAC-005: Access Denied (403)](#6-uc-rbac-005-access-denied)
7. [UC-RBAC-006: Admin Creates a User](#7-uc-rbac-006-admin-creates-a-user)
8. [UC-RBAC-007: Admin Bulk Imports Students](#8-uc-rbac-007-admin-bulk-imports-students)
9. [UC-RBAC-008: Admin Manages Departments and Sections](#9-uc-rbac-008-admin-manages-departments-and-sections)
10. [UC-RBAC-009: Admin Assigns Faculty to Sections](#10-uc-rbac-009-admin-assigns-faculty-to-sections)
11. [UC-RBAC-010: Faculty Accesses Assigned Section Data](#11-uc-rbac-010-faculty-accesses-assigned-section-data)
12. [UC-RBAC-011: Student Accesses Own Records](#12-uc-rbac-011-student-accesses-own-records)
13. [UC-RBAC-012: First-time Bootstrap (Seed Admin)](#13-uc-rbac-012-bootstrap)
14. [UC-RBAC-013: Admin Resets User Password](#14-uc-rbac-013-admin-resets-user-password)
15. [Permission Resolution Reference Table](#15-permission-resolution-reference-table)

---

## 1. Use Case Inventory

| ID | Name | Actor | Priority | Phase |
|----|------|-------|----------|-------|
| UC-RBAC-001 | User Login | Any registered user | P0 | Phase 1 |
| UC-RBAC-002 | Token Refresh | Browser (automatic) | P0 | Phase 1 |
| UC-RBAC-003 | User Logout | Any authenticated user | P0 | Phase 1 |
| UC-RBAC-004 | Access Protected Endpoint | Any authenticated user | P0 | Phase 1 |
| UC-RBAC-005 | Access Denied | Any authenticated user | P0 | Phase 1 |
| UC-RBAC-006 | Create User | Admin | P0 | Phase 1 |
| UC-RBAC-007 | Bulk Import Students | Admin | P0 | Phase 1 |
| UC-RBAC-008 | Manage Departments & Sections | Admin | P0 | Phase 1 |
| UC-RBAC-009 | Assign Faculty to Sections | Admin | P0 | Phase 1 |
| UC-RBAC-010 | Faculty Accesses Section Data | Faculty | P0 | Phase 1 |
| UC-RBAC-011 | Student Accesses Own Records | Student | P0 | Phase 1 |
| UC-RBAC-012 | Bootstrap Admin | System (seed script) | P0 | Phase 1 |
| UC-RBAC-013 | Admin Resets Password | Admin | P1 | Phase 1 |

---

## 2. UC-RBAC-001: User Login

**Actor:** Any registered user (Admin, Faculty, or Student)
**Endpoint:** `POST /api/auth/login`

### Preconditions
- User has a registered account (`is_active = true`).
- Backend is running with `AUTH_ENABLED=true`.

### Main Success Scenario
1. User navigates to `/login` (redirected there by React Router guard if not authenticated).
2. User enters email and password and submits the form.
3. Frontend sends `POST /api/auth/login` with body `{ email, password }`.
4. `AuthService` queries the database for the user by email.
5. `bcrypt.verify(password, user.password_hash)` returns `true`.
6. `AuthService.login()` signs a JWT access token (TTL: 15 min, payload: `{ sub, email, role }`).
7. `AuthService.login()` generates a random 32-byte refresh token, hashes it (SHA-256), inserts the hash into `refresh_tokens` with `expires_at = now + 7 days`.
8. Response sets two httpOnly cookies: `access_token` (15 min) and `refresh_token` (7 days).
9. Response body includes user object: `{ id, email, name, role, department_id }`.
10. Frontend redirects user to role-specific dashboard:
    - Admin -> `/admin/dashboard`
    - Faculty -> `/faculty/dashboard`
    - Student -> `/student/dashboard`

### Alternative Flow A — Wrong Password
- Step 5: `bcrypt.verify` returns `false`.
- Response: `401 Unauthorized { "detail": "Invalid credentials" }`.
- Frontend shows inline error: "Invalid email or password."

### Alternative Flow B — User Not Found
- Step 4: no user row for that email.
- Response: `401 Unauthorized { "detail": "Invalid credentials" }`.
- Same error message as wrong password — do not reveal whether the email exists.

### Alternative Flow C — Account Inactive
- Step 4: user found but `is_active = false`.
- Response: `401 Unauthorized { "detail": "Account is disabled. Contact your administrator." }`.

### Alternative Flow D — Rate Limit Hit
- More than 5 login attempts from the same IP within 60 seconds.
- Response: `429 Too Many Requests { "detail": "Too many login attempts. Try again later.", "retry_after": 60 }`.

### Postconditions
- `refresh_tokens` table contains a new hashed token row for this user.
- User's browser has two httpOnly cookies set.
- `User.last_login_at` updated to `now()`.

---

## 3. UC-RBAC-002: Token Refresh

**Actor:** Browser (automatic — transparent to user)
**Endpoint:** `POST /api/auth/refresh`

### Preconditions
- User's access token has expired (or is about to expire).
- User's refresh token is still valid (not expired, not revoked).

### Main Success Scenario
1. A request to a protected endpoint returns `401 Unauthorized`.
2. The frontend API client intercepts the 401 and calls `POST /api/auth/refresh` automatically.
3. The browser sends the `refresh_token` cookie automatically.
4. `AuthService` reads the raw refresh token from the cookie, hashes it (SHA-256), queries `refresh_tokens` by hash.
5. Token found, not expired, `revoked_at` is null — token is valid.
6. New access token signed (15 min TTL).
7. New refresh token generated, hashed, inserted into `refresh_tokens`. Old refresh token's `revoked_at` set to `now()` (rotation).
8. Response sets new `access_token` cookie (15 min) and new `refresh_token` cookie (7 days).
9. Frontend API client retries the original request with the new access token.
10. Original request succeeds.

### Alternative Flow A — Refresh Token Expired
- Step 5: `expires_at < now()`.
- Response: `401 Unauthorized { "detail": "Session expired. Please log in again." }`.
- Frontend redirects user to `/login`.

### Alternative Flow B — Refresh Token Already Revoked
- Step 5: `revoked_at` is not null.
- This may indicate token theft and replay. Log a security warning.
- Response: `401 Unauthorized { "detail": "Session invalid. Please log in again." }`.
- Frontend redirects user to `/login`.

### Postconditions
- Old refresh token row has `revoked_at` set.
- New refresh token row inserted.
- User remains on the same page, original request completes transparently.

---

## 4. UC-RBAC-003: User Logout

**Actor:** Any authenticated user
**Endpoint:** `POST /api/auth/logout`

### Preconditions
- User has a valid session (access token cookie present).

### Main Success Scenario
1. User clicks "Logout" in the UI.
2. Frontend sends `POST /api/auth/logout` with the cookie.
3. Auth middleware validates the access token.
4. `AuthService` reads the refresh token from the cookie, hashes it, finds the row in `refresh_tokens`, sets `revoked_at = now()`.
5. Response clears both cookies by setting them with `max_age=0`.
6. Response: `204 No Content`.
7. Frontend redirects user to `/login`.

### Alternative Flow A — Access Token Already Expired at Logout
- Step 3: Auth middleware returns 401.
- Even so, the frontend should still clear its local state and send the user to `/login`.
- The refresh token remains in the database until its natural expiry or until a cleanup job runs.

### Postconditions
- Both cookies are cleared in the browser.
- Refresh token is revoked in the database.
- User cannot access protected endpoints without logging in again.

---

## 5. UC-RBAC-004: Access a Protected Endpoint

**Actor:** Any authenticated user
**Trigger:** Any API call to a guarded endpoint

### Preconditions
- User is authenticated (valid `access_token` cookie).
- The endpoint has role-based permission requirements.

### Scenario A — Admin Accesses Any Resource
1. Request arrives with valid JWT.
2. `require_auth` middleware validates token, attaches `{ user_id, email, role }` to request state.
3. `require_role("admin")` middleware checks user's role — is `admin`.
4. Middleware returns, controller handler executes. Response returned.

### Scenario B — Faculty Accesses Assigned Section
1-2. Same as Scenario A.
3. `require_role("faculty")` passes.
4. `require_section_access` middleware extracts `section_id` from URL params.
5. Middleware queries `faculty_section_assignments` for `(user_id, section_id)` — found.
6. Middleware passes. Controller handler executes.

### Scenario C — Student Accesses Own Records
1-2. Same as Scenario A.
3. `require_role("student")` passes.
4. `require_self_access` middleware extracts `student_id` from URL params.
5. Middleware verifies `request.user.id == student_id` — match.
6. Controller handler executes.

### Postconditions
- Controller handler runs and returns its normal response.
- No change to auth state.

---

## 6. UC-RBAC-005: Access Denied

**Actor:** Any authenticated user without sufficient permissions
**Response:** `403 Forbidden`

### Scenario A — Student Tries to Mark Attendance
1. Authenticated student calls `POST /api/attendance/mark`.
2. `require_role` checks: student role does not have `attendance:mark` permission.
3. Response: `403 Forbidden { "detail": "Insufficient permissions" }`.

### Scenario B — Faculty Tries to Access Unassigned Section
1. Authenticated faculty calls `GET /api/sections/{section_id}/students`.
2. Role check passes (faculty has `student:view_profile` for assigned sections).
3. `require_section_access` checks `faculty_section_assignments` — no row found for this faculty + section.
4. Response: `403 Forbidden { "detail": "You are not assigned to this section" }`.

### Scenario C — Student Tries to View Another Student's Data
1. Student A calls `GET /api/students/{student_b_id}/attendance`.
2. Role check passes (student has `attendance:view` for self).
3. `require_self_access` checks: `request.user.id != student_b_id`.
4. Response: `403 Forbidden { "detail": "You can only access your own records" }`.

### Scenario D — Faculty Tries to Manage Users
1. Authenticated faculty calls `POST /api/users`.
2. `require_role("admin")` — faculty role is not admin.
3. Response: `403 Forbidden`.

---

## 7. UC-RBAC-006: Admin Creates a User

**Actor:** Admin
**Endpoint:** `POST /api/users`

### Preconditions
- Actor is authenticated as `admin`.

### Main Success Scenario
1. Admin opens `/admin/users` page and clicks "Create User".
2. Fills in: name, email, password, role (dropdown: `admin`, `faculty`, `student`).
3. If role is `student`: fills in USN, department, semester, section.
4. If role is `faculty`: fills in employee ID, department.
5. Frontend sends `POST /api/users { name, email, password, role, ... }`.
6. `require_role("admin")` confirms actor has permission — allowed.
7. `UserService.create()` validates uniqueness of email.
8. `bcrypt.hash(password)` with cost 12 produces `password_hash`.
9. Database insert creates user row (and student/faculty profile if applicable).
10. Response: `201 Created { id, email, name, role, is_active, created_at }` — no `password_hash` in response.
11. New user appears in the users table.

### Alternative Flow A — Duplicate Email
- Step 7: email already exists in `users` table.
- Response: `409 Conflict { "detail": "A user with this email already exists." }`.

### Alternative Flow B — Invalid Role
- DTO validation rejects the value before reaching the service.
- Response: `422 Unprocessable Entity`.

### Alternative Flow C — Invalid USN Format (Student)
- USN does not match VTU format regex `^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$`.
- Response: `422 Unprocessable Entity { "detail": "Invalid USN format" }`.

### Postconditions
- New `users` row created.
- If student: `student_profiles` row created with department, semester, section linkage.
- If faculty: `faculty_profiles` row created with department linkage.
- New user can log in immediately.

---

## 8. UC-RBAC-007: Admin Bulk Imports Students

**Actor:** Admin
**Endpoint:** `POST /api/users/bulk-import`

### Preconditions
- Actor is authenticated as `admin`.
- CSV file prepared with columns: `name, email, usn, department_code, semester, section`.

### Main Success Scenario
1. Admin opens `/admin/users` page and clicks "Bulk Import".
2. Selects a CSV file.
3. Frontend sends `POST /api/users/bulk-import` with multipart form data.
4. Backend parses CSV, validates each row.
5. For each valid row: creates user with `student` role, generates temporary password, creates student profile.
6. Response: `200 OK { "imported": 480, "skipped": 5, "errors": [...] }`.
7. Admin downloads the generated credentials list (name, email, temporary password) for distribution.

### Alternative Flow A — Invalid CSV Format
- Missing required columns.
- Response: `400 Bad Request { "detail": "CSV missing required columns: name, email, usn" }`.

### Alternative Flow B — Duplicate Entries
- Some rows have emails that already exist.
- Those rows are skipped. Response includes them in the `skipped` count with reasons.

### Alternative Flow C — Invalid Department/Section References
- Department code or section not found in the system.
- Those rows are included in `errors` with reason.

### Postconditions
- Multiple `users` and `student_profiles` rows created.
- Temporary passwords generated (bcrypt hashed, plaintext in the download file).
- Admin can distribute credentials to students.

---

## 9. UC-RBAC-008: Admin Manages Departments and Sections

**Actor:** Admin
**Endpoints:** `POST /api/departments`, `POST /api/sections`

### Preconditions
- Actor is authenticated as `admin`.

### Main Success Scenario — Create Department
1. Admin opens `/admin/departments` and clicks "Create Department".
2. Fills in: code ("CSE"), name ("Computer Science and Engineering").
3. Frontend sends `POST /api/departments { code, name }`.
4. Service validates uniqueness of code, inserts row.
5. Response: `201 Created { id, code, name }`.

### Main Success Scenario — Create Section
1. Admin navigates to a department detail page.
2. Clicks "Add Section".
3. Fills in: name ("A"), semester (3), academic_year ("2025-26").
4. Frontend sends `POST /api/departments/{dept_id}/sections { name, semester, academic_year }`.
5. Service validates no duplicate section for same department + semester + name + year.
6. Response: `201 Created { id, name, semester, academic_year, department_id }`.

### Alternative Flow A — Duplicate Department Code
- Response: `409 Conflict { "detail": "Department code already exists." }`.

### Alternative Flow B — Duplicate Section
- Response: `409 Conflict { "detail": "Section already exists for this department, semester, and academic year." }`.

### Postconditions
- Department/section rows created.
- Available for faculty assignment and student placement.

---

## 10. UC-RBAC-009: Admin Assigns Faculty to Sections

**Actor:** Admin
**Endpoint:** `POST /api/faculty-assignments`

### Preconditions
- Actor is authenticated as `admin`.
- Faculty user and section exist.

### Main Success Scenario
1. Admin opens `/admin/faculty-assignments` or navigates from section detail.
2. Selects faculty member and section(s) to assign.
3. Optionally specifies subject name for context.
4. Frontend sends `POST /api/faculty-assignments { faculty_id, section_id, subject }`.
5. Service inserts `faculty_section_assignments` row.
6. Response: `201 Created { faculty_id, section_id, subject, assigned_at }`.
7. Faculty member can now access this section's attendance and marks endpoints.

### Alternative Flow A — Faculty Not Found
- Response: `404 Not Found { "detail": "Faculty member not found." }`.

### Alternative Flow B — Assignment Already Exists
- Response: `409 Conflict { "detail": "Faculty is already assigned to this section." }`.

### Postconditions
- `faculty_section_assignments` row created.
- Faculty immediately has access to the section's data (no cache — middleware queries DB on each request).

---

## 11. UC-RBAC-010: Faculty Accesses Assigned Section Data

**Actor:** Faculty
**Endpoint:** e.g., `GET /api/sections/{section_id}/students`

### Preconditions
- Faculty is authenticated.
- Faculty has an active assignment to the requested section.

### Main Success Scenario
1. Faculty navigates to their dashboard, sees list of assigned sections.
2. Clicks on "CSE 3rd Sem - Section A".
3. Frontend calls `GET /api/sections/{section_id}/students`.
4. `require_auth` validates JWT.
5. `require_role("faculty", "admin")` — passes for faculty.
6. `require_section_access` queries `faculty_section_assignments WHERE user_id = faculty.id AND section_id = {section_id}` — found.
7. Controller returns list of students in that section.

### Alternative Flow A — Not Assigned to Section
- Step 6: No assignment row found.
- Response: `403 Forbidden { "detail": "You are not assigned to this section" }`.

### Postconditions
- No state changes. Read-only operation.
- Faculty sees only students in their assigned section.

---

## 12. UC-RBAC-011: Student Accesses Own Records

**Actor:** Student
**Endpoint:** e.g., `GET /api/students/me/attendance`

### Preconditions
- Student is authenticated.

### Main Success Scenario
1. Student navigates to their dashboard.
2. Clicks "My Attendance".
3. Frontend calls `GET /api/students/me/attendance` (the `me` placeholder resolves to the authenticated user's student profile).
4. `require_auth` validates JWT.
5. `require_role("student")` — passes.
6. Backend resolves `me` to the authenticated student's ID.
7. Returns attendance records for the authenticated student only.

### Alternative Flow A — Student Tries to Access Another Student
1. Student manually crafts `GET /api/students/{other_student_id}/attendance`.
2. `require_self_access` middleware checks: `request.user.id != other_student_id`.
3. Response: `403 Forbidden { "detail": "You can only access your own records" }`.

### Postconditions
- No state changes. Read-only operation.

---

## 13. UC-RBAC-012: Bootstrap

**Actor:** System (seed script)
**Command:** `python -m app.seed`

### Preconditions
- Database schema has been migrated.
- Environment variables `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set.

### Main Success Scenario
1. Script runs as part of first deployment.
2. Checks if any `admin` user exists.
3. If not: creates user with `{ email: SEED_ADMIN_EMAIL, role: admin, is_active: true }` and hashed password.
4. Prints: `Admin user created: admin@cec.edu.in`.

### Alternative Flow A — Admin Already Exists
- Script detects existing admin user.
- Prints: `Admin user already exists. Skipping.`
- Exits cleanly with no changes.

### Postconditions
- At least one `admin` user exists in the system.
- Admin can log in and create other users.

---

## 14. UC-RBAC-013: Admin Resets User Password

**Actor:** Admin
**Endpoint:** `PATCH /api/users/{user_id}/reset-password`

### Preconditions
- Actor is authenticated as `admin`.

### Main Success Scenario
1. Admin opens user detail page, clicks "Reset Password".
2. Enters a new temporary password.
3. Frontend sends `PATCH /api/users/{user_id}/reset-password { new_password }`.
4. Service hashes the new password with bcrypt.
5. Updates the user's `password_hash`.
6. Revokes all active refresh tokens for the user (forces re-login).
7. Response: `200 OK { "message": "Password reset successfully" }`.

### Postconditions
- User's password is updated.
- All existing sessions are invalidated.
- User must log in with the new password.

---

## 15. Permission Resolution Reference Table

| Step | Check | Data Source | Result |
|------|-------|-------------|--------|
| 1 | Is user authenticated? | JWT cookie | No -> `401` |
| 2 | Does user's role have the required permission? | `ROLE_PERMISSIONS` map in code | No -> `403` |
| 3 | (Admin) Bypass scope check | User role == `admin` | Yes -> Allow |
| 4 | (Faculty) Is faculty assigned to this section? | `faculty_section_assignments` table | No -> `403` |
| 5 | (Student) Is student accessing own records? | `request.user.id == resource.student_id` | No -> `403` |
| 6 | All checks pass | — | Allow |
