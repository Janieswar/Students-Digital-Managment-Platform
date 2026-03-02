# RBAC — Feature Overview & Requirements

## Iteration: RBAC | Priority: P0 (Security Prerequisite)

---

## Table of Contents

1. [Overview and Problem Statement](#1-overview-and-problem-statement)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Actors and Stakeholders](#3-actors-and-stakeholders)
4. [Feature Scope by Phase](#4-feature-scope-by-phase)
5. [Role Definitions](#5-role-definitions)
6. [Permission Matrix](#6-permission-matrix)
7. [Department & Section Model](#7-department--section-model)
8. [Open Questions and Decisions](#8-open-questions-and-decisions)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Glossary](#10-glossary)

---

## 1. Overview and Problem Statement

### Current State

The CEC Student Digital Platform is being built from scratch to replace paper-based processes at City Engineering College, Bengaluru. There is currently **no digital system** for managing student attendance, academic records, fee payments, or parent communication.

### Risk Surface

Without authentication and role-based access control as the foundational iteration:

| Concern | Impact |
|---------|--------|
| Student data exposure | Any user could view or modify any student's academic records, attendance, and personal information |
| Fee manipulation | Unauthorized users could alter payment records or mark fees as paid |
| Attendance fraud | Students could mark their own attendance or modify records |
| Grade tampering | Academic marks and grade cards could be modified by unauthorized users |
| Regulatory non-compliance | VTU and AICTE require audit trails and access controls on student data |
| NAAC accreditation risk | Data integrity and governance are key NAAC assessment criteria |

### Why First

RBAC must be the first iteration because every subsequent feature (attendance, academics, payments, parent portal) depends on knowing **who** the user is and **what** they are allowed to do. Building features without auth creates technical debt that is expensive to retrofit.

### Solution

Implement Role-Based Access Control (RBAC) that:
1. Requires all API callers to authenticate via email and password.
2. Issues short-lived JWT access tokens and long-lived refresh tokens stored in httpOnly cookies.
3. Enforces role-based permissions on every endpoint.
4. Supports three primary roles: **Admin**, **Faculty**, and **Student** — with provisions for future roles (HOD, Principal, Parent).
5. Associates Faculty and Students with specific **departments** and **sections** for data scoping.
6. Provides a seed script for the initial Admin account.

---

## 2. Goals and Non-Goals

### Goals

- Every API endpoint requires a valid authenticated session.
- Access to endpoints is controlled by the caller's role.
- Faculty can only access data for their assigned departments/sections.
- Students can only access their own records.
- An `admin` can bootstrap and manage the entire user structure.
- All new auth endpoints are tested with unit, integration, and security tests.
- The system supports VTU-mandated data segregation by department and semester.

### Non-Goals (Phase 1)

- **SSO / SAML / OIDC federation** — Internal email/password for Phase 1. SSO can wrap the same guard infrastructure in a future phase.
- **MFA / Two-factor authentication** — Not in Phase 1. Can be added later for admin accounts.
- **Self-service password reset via email** — Admin-only reset for Phase 1 (no email infrastructure).
- **Parent portal authentication** — Parents are a future-phase role. Phase 1 focuses on Admin, Faculty, Student.
- **HOD / Principal / Board Member roles** — Future phases. Phase 1 Admin role covers all administrative functions.
- **Biometric authentication** — Out of scope. QR-based attendance is a separate iteration.
- **Student self-registration** — Admin bulk-imports students. No public sign-up.

---

## 3. Actors and Stakeholders

| Actor | Type | How They Use RBAC |
|-------|------|-------------------|
| **Admin** | Human — CEC administrative staff | Full platform access. Manages users, departments, sections. Bulk imports students and faculty. Views all reports. |
| **Faculty** | Human — CEC teaching staff | Manages attendance for assigned sections, enters IA marks, posts announcements. Can only access students in their assigned department/sections. |
| **Student** | Human — CEC enrolled student | Views own attendance, marks, fee status, timetable, announcements. Cannot view other students' data. Cannot modify any records. |
| **HOD** (Phase 2) | Human — Head of Department | Department-level oversight. Views all faculty and student data within their department. |
| **Principal** (Phase 2) | Human — College principal | Institution-wide read access to all dashboards and reports. |
| **Parent** (Phase 3) | Human — Student's parent/guardian | Read-only access to their ward's attendance, marks, and fee status. Receives alerts. |

---

## 4. Feature Scope by Phase

### Phase 1 — Backend Auth + RBAC (1-2 sprints)

- Database schema: 5 new tables (`users`, `refresh_tokens`, `departments`, `sections`, `faculty_section_assignments`)
- `AuthRouter`: login, logout, token refresh, `/me` endpoint
- `UsersRouter`: CRUD users, bulk import students/faculty
- Role-based middleware: `require_auth`, `require_role`, `require_department_access`
- Guards applied to all existing and future routers
- `AUTH_ENABLED` feature flag for safe cutover
- Seed script for first `admin` user
- Rate limiting on login (5 req/min per IP)
- Unit, integration, and security tests

### Phase 2 — Frontend Auth (1 sprint)

- `/login` page
- `AuthContext` + `useAuth` hook
- Route protection via React Router guards
- Role-conditional sidebar navigation
- `/admin/users` management page
- `/admin/departments` management page
- Role-specific dashboard routing (Admin -> admin dashboard, Faculty -> faculty dashboard, Student -> student dashboard)

### Phase 3 — Audit Logging (1 sprint)

- `audit_logs` table
- `AuditService` with `log(actor, action, resource, metadata)` method
- Instrumentation on: login attempts, user role changes, grade modifications, attendance edits
- `GET /api/admin/audit-logs` endpoint (admin only)

---

## 5. Role Definitions

### System Roles

| Role | Who | Description |
|------|-----|-------------|
| `admin` | CEC administrative staff | Full platform access. Manages users, departments, configurations. Can view and export all data. Implicitly bypasses department-level checks. |
| `faculty` | CEC teaching staff | Manages attendance and academic data for assigned sections. Can post announcements. Scoped to assigned departments and sections. |
| `student` | CEC enrolled student | Read-only access to own records: attendance, marks, fee status, timetable, announcements. Cannot access other students' data. |

### Future Roles (Phase 2+)

| Role | Who | Description |
|------|-----|-------------|
| `hod` | Head of Department | Department-wide read access. Can approve faculty leave, view department analytics. |
| `principal` | College Principal | Institution-wide read access. Dashboard and report access across all departments. |
| `parent` | Student's parent/guardian | Read-only access to linked student's attendance, marks, fee status. Receives automated alerts. |

---

## 6. Permission Matrix

### System-level permissions

| Permission | `admin` | `faculty` | `student` |
|------------|:---:|:---:|:---:|
| `user:create` | Yes | No | No |
| `user:read` | Yes | No | No |
| `user:update` | Yes | No | No |
| `user:delete` | Yes | No | No |
| `user:bulk_import` | Yes | No | No |
| `department:manage` | Yes | No | No |
| `section:manage` | Yes | No | No |
| `report:view_all` | Yes | No | No |
| `config:manage` | Yes | No | No |

### Department-scoped permissions

| Permission | `admin` | `faculty` (assigned) | `student` (own) |
|------------|:---:|:---:|:---:|
| `attendance:mark` | Yes | Yes | No |
| `attendance:edit` | Yes | Yes | No |
| `attendance:view` | Yes | Yes (section) | Yes (self) |
| `marks:enter` | Yes | Yes | No |
| `marks:edit` | Yes | Yes | No |
| `marks:view` | Yes | Yes (section) | Yes (self) |
| `announcement:create` | Yes | Yes | No |
| `announcement:view` | Yes | Yes | Yes |
| `fee:view` | Yes | No | Yes (self) |
| `fee:manage` | Yes | No | No |
| `timetable:manage` | Yes | No | No |
| `timetable:view` | Yes | Yes | Yes |
| `student:view_profile` | Yes | Yes (section) | Yes (self) |

**Key design decisions in the matrix:**

- `faculty` can only view/modify attendance and marks for sections they are explicitly assigned to.
- `student` can only view their own records — never other students' data.
- `admin` has implicit access to all departments and sections without explicit assignment.
- `fee:view` is available to students (own fees) and admin (all fees), but not faculty — fee management is an administrative function.
- `announcement:view` is universal — all roles can see announcements relevant to their scope.

---

## 7. Department & Section Model

### The Problem Without Department Scoping

CEC has 8+ engineering departments (CSE, ISE, ECE, EEE, ME, CE, AIML, etc.), each with multiple sections (A, B, C). Without department-level scoping:
- A faculty member from CSE could view or modify ECE student attendance.
- A student in Section A could see Section B's data.
- Admin reports would have no department-level filtering.

### The Solution: Department + Section + Assignment

A **Department** represents an engineering branch (e.g., Computer Science and Engineering). A **Section** is a subdivision within a department and semester (e.g., CSE 3rd Sem Section A). Faculty are assigned to specific sections via `faculty_section_assignments`.

```
Department: Computer Science and Engineering (CSE)
  Sections:
    CSE-3A  (3rd semester, Section A, 60 students)
    CSE-3B  (3rd semester, Section B, 60 students)
    CSE-5A  (5th semester, Section A, 55 students)

Faculty Assignments:
  Prof. Ramesh  -> CSE-3A (Data Structures)
  Prof. Ramesh  -> CSE-3B (Data Structures)
  Prof. Sunita  -> CSE-5A (DBMS)

Permission Resolution:
  Prof. Ramesh -> can mark attendance for CSE-3A and CSE-3B only
  Prof. Sunita -> can mark attendance for CSE-5A only
  Admin        -> can view all sections across all departments
```

### Student Department Association

Each student record includes `department_id`, `current_semester`, and `section_id`. Students can only access data scoped to themselves.

### Permission Resolution Order

```
1. Authentication check
   -> Is the user authenticated with a valid JWT?
   -> NO -> 401 Unauthorized.

2. Role check
   -> Does the user's role grant the required permission?
   -> NO -> 403 Forbidden.

3. Department/Section scope check (for faculty)
   -> Is the faculty member assigned to the relevant section?
   -> NO -> 403 Forbidden.

4. Self-access check (for students)
   -> Is the student accessing their own records?
   -> NO -> 403 Forbidden.

5. Admin bypass
   -> Admin role implicitly passes all scope checks.
```

---

## 8. Open Questions and Decisions

| # | Question | Default Assumption | Status |
|---|----------|--------------------|--------|
| 1 | **Identity provider** — Internal email/password or Google SSO? | Internal for Phase 1. SSO wraps the same middleware later. | Open |
| 2 | **Student ID as username** — Should students log in with USN (University Seat Number) or email? | Email for consistency. USN stored as a separate field. | Open |
| 3 | **Faculty multi-department** — Can a faculty member be assigned to sections across departments? | Yes — `faculty_section_assignments` supports cross-department assignments. | Open |
| 4 | **Admin sub-roles** — Should there be different admin levels (super admin, department admin)? | Single `admin` role for Phase 1. Sub-roles in Phase 2 if needed. | Open |
| 5 | **Password policy** — Minimum complexity requirements? | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit. No special char requirement. | Open |
| 6 | **Password reset** — Admin-only or self-service via email? | Admin-only for Phase 1 (no email infrastructure). | Open |
| 7 | **Bulk import format** — CSV or Excel for student/faculty import? | CSV with defined column schema. Excel parsing adds complexity. | Open |
| 8 | **Session management** — Should admin be able to force-logout all sessions for a user? | Yes — revoke all refresh tokens for a user on deactivation. | Open |
| 9 | **VTU USN validation** — Should USN format be validated on import? | Yes — VTU USN format: `XYYZZNNNN` (e.g., `1CG21CS001`). Regex validation on import. | Open |
| 10 | **Academic year** — How to handle year transitions and section reassignment? | Manual reassignment by admin at start of each semester. Automated promotion in Phase 3. | Open |

---

## 9. Acceptance Criteria

### Phase 1 Complete When:

- [ ] AC-01: All API endpoints return `401 Unauthorized` when called without a valid JWT.
- [ ] AC-02: A user with `student` role receives `403 Forbidden` on any write operation (POST/PATCH/DELETE) against attendance or marks endpoints.
- [ ] AC-03: A user with `faculty` role receives `403 Forbidden` when attempting to access sections they are not assigned to.
- [ ] AC-04: A user with `admin` role can successfully access any endpoint regardless of department/section scope.
- [ ] AC-05: Login with wrong credentials returns `401`. Login with valid credentials sets two httpOnly cookies.
- [ ] AC-06: The login endpoint blocks further requests after 5 attempts within 60 seconds from the same IP (429 response).
- [ ] AC-07: A student can only view their own attendance, marks, and fee status — never another student's data.
- [ ] AC-08: Bulk import of 500 students completes within 30 seconds and creates valid user accounts.
- [ ] AC-09: Faculty assigned to CSE-3A can mark attendance for CSE-3A but receives 403 for CSE-3B (if not assigned).
- [ ] AC-10: All unit, integration, and security tests pass with >= 80% line coverage on auth modules.
- [ ] AC-11: Deploying with `AUTH_ENABLED=false` leaves all endpoints fully functional with no auth required.

### Phase 2 Complete When:

- [ ] AC-12: Unauthenticated navigation to any protected route redirects to `/login`.
- [ ] AC-13: After login, the sidebar shows only the nav items appropriate to the user's role.
- [ ] AC-14: Admin can view and manage all users from `/admin/users`.
- [ ] AC-15: Faculty dashboard shows only their assigned sections.
- [ ] AC-16: Student dashboard shows only their own academic data.

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **JWT** | JSON Web Token. A signed, base64-encoded token containing a user's identity and claims. Used as the access credential after login. |
| **Access token** | Short-lived JWT (15 min) that authorizes API requests. Stored in an httpOnly cookie. |
| **Refresh token** | Long-lived token (7 days) used to obtain a new access token without re-entering credentials. Stored as SHA-256 hash in database. |
| **USN** | University Seat Number. Unique identifier assigned by VTU to each student. Format: `XYYZZNNNN`. |
| **VTU** | Visvesvaraya Technological University. The affiliating university for CEC. |
| **AICTE** | All India Council for Technical Education. National regulatory body for technical education. |
| **NAAC** | National Assessment and Accreditation Council. Accreditation body that assesses institutional quality. |
| **Department** | An engineering branch at CEC (e.g., CSE, ISE, ECE, AIML). |
| **Section** | A subdivision of students within a department and semester (e.g., CSE 3rd Sem Section A). |
| **IA** | Internal Assessment. Marks awarded by the college for continuous evaluation (separate from VTU exam marks). |
| **SGPA** | Semester Grade Point Average. Calculated per semester per VTU formula. |
| **CGPA** | Cumulative Grade Point Average. Calculated across all semesters. |
