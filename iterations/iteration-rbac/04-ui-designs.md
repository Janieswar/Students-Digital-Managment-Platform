# RBAC — UI Screen Designs

## Iteration: RBAC | React + Vite + Tailwind CSS + shadcn/ui

---

## Table of Contents

1. [Design System Reference](#1-design-system-reference)
2. [Screen 1: Login Page](#2-screen-1-login-page)
3. [Screen 2: Admin Dashboard](#3-screen-2-admin-dashboard)
4. [Screen 3: User Management](#4-screen-3-user-management)
5. [Screen 4: Department Management](#5-screen-4-department-management)
6. [Screen 5: Section Detail](#6-screen-5-section-detail)
7. [Screen 6: Faculty Assignment Management](#7-screen-6-faculty-assignment-management)
8. [Screen 7: Faculty Dashboard](#8-screen-7-faculty-dashboard)
9. [Screen 8: Student Dashboard](#9-screen-8-student-dashboard)
10. [Modified: Sidebar](#10-modified-sidebar)
11. [State Management and Data Fetching](#11-state-management-and-data-fetching)
12. [Validation Rules](#12-validation-rules)
13. [API Coverage Matrix](#13-api-coverage-matrix)

---

## 1. Design System Reference

### Color Palette

```
Primary:     hsl(222.2, 84%, 4.9%)   -- Sidebar, headers
Accent:      hsl(217.2, 91.2%, 59.8%) -- Buttons, links
Destructive: hsl(0, 84.2%, 60.2%)    -- Delete, deactivate
Warning:     hsl(38, 92%, 50%)       -- Inactive user badge, low attendance
Success:     hsl(142.1, 76.2%, 36.3%) -- Active badge, good attendance
Muted:       hsl(210, 40%, 96.1%)    -- Backgrounds, empty states
```

### Role Badges — Consistent Color Coding

| Role | Badge Color | Text |
|------|-------------|------|
| `admin` | Red | Admin |
| `faculty` | Blue | Faculty |
| `student` | Green | Student |
| `hod` (future) | Purple | HOD |
| `principal` (future) | Orange | Principal |
| `parent` (future) | Cyan | Parent |

### Typography

```
H1: text-3xl font-bold   (page titles)
H2: text-xl font-semibold (section headers)
Body: text-sm             (default text)
Mono: font-mono text-sm   (USN, IDs, codes)
```

### Spacing

```
Page padding: p-6 (24px)
Card gap: gap-6 (24px)
Table cell padding: px-4 py-3
```

### Components (shadcn/ui)

```
Button, Input, Label, Select, Table, Card, Dialog, Badge,
Tabs, Skeleton, Alert, Toast, DropdownMenu, Separator
```

---

## 2. Screen 1: Login Page

**Path:** `/login`
**Access:** Public (no auth required)

### Layout

```
+------------------------------------------------------------+
|                                                            |
|                                                            |
|                  +----------------------+                  |
|                  |   CEC Student        |                  |
|                  |   Digital Platform   |                  |
|                  |                      |                  |
|                  |   City Engineering   |                  |
|                  |   College, Bengaluru |                  |
|                  |                      |                  |
|                  |   Sign in to your    |                  |
|                  |   account            |                  |
|                  |                      |                  |
|                  |   Email              |                  |
|                  |   +--------------+   |                  |
|                  |   |              |   |                  |
|                  |   +--------------+   |                  |
|                  |                      |                  |
|                  |   Password           |                  |
|                  |   +--------------+   |                  |
|                  |   |          eye |   |                  |
|                  |   +--------------+   |                  |
|                  |                      |                  |
|                  |   +----------------+ |                  |
|                  |   |    Sign In     | |                  |
|                  |   +----------------+ |                  |
|                  |                      |                  |
|                  |   [error msg here]   |                  |
|                  +----------------------+                  |
|                                                            |
+------------------------------------------------------------+
```

### Fields

| Field | Type | Validation | Placeholder |
|-------|------|------------|-------------|
| Email | `<input type="email">` | Required, valid email format | `you@cec.edu.in` |
| Password | `<input type="password">` | Required, min 1 char | (bullet dots) |

Password field has a show/hide toggle (eye icon). Password is never logged to console.

### States

| State | UI Behavior |
|-------|-------------|
| **Default** | Form visible, Sign In button enabled |
| **Loading** | Button shows spinner, text "Signing in...", disabled |
| **Error -- invalid credentials** | Inline error below button: "Invalid email or password." Red text. |
| **Error -- account inactive** | Inline error: "Your account has been disabled. Contact your administrator." |
| **Error -- rate limit** | Banner above form: "Too many login attempts. Try again in 60 seconds." |
| **Success** | Redirect to role-specific dashboard |

### Interactions

- Enter key submits the form.
- On success: store no tokens in localStorage. Cookies are set by server (httpOnly).
- Redirect based on role: admin -> `/admin/dashboard`, faculty -> `/faculty/dashboard`, student -> `/student/dashboard`.

---

## 3. Screen 2: Admin Dashboard

**Path:** `/admin/dashboard`
**Access:** `admin` only

### Layout

```
+--- Sidebar ---+----------------------------------------------+
| CEC Student   |  Dashboard                                    |
| Platform      |                                               |
|               |  +----------+ +----------+ +----------+       |
| Dashboard  <- |  | Total    | | Total    | | Total    |       |
| Users         |  | Students | | Faculty  | | Depts    |       |
| Departments   |  |   1,240  | |     85   | |      8   |       |
| Assignments   |  +----------+ +----------+ +----------+       |
|               |                                               |
|               |  +----------+ +----------+ +----------+       |
|               |  | Active   | | Inactive | | Sections |       |
|               |  | Users    | | Users    | |          |       |
|               |  |   1,310  | |     15   | |     48   |       |
|               |  +----------+ +----------+ +----------+       |
|               |                                               |
|               |  Recent Activity                              |
|               |  +------------------------------------------+ |
|               |  | Time    User         Action               | |
|               |  | 2m ago  admin@cec    Created 60 students  | |
|               |  | 1h ago  admin@cec    Added section CSE-5B | |
|               |  +------------------------------------------+ |
+---------------+-----------------------------------------------+
```

### Stat Cards

| Card | API Call | Value |
|------|----------|-------|
| Total Students | `GET /api/users?role=student&count=true` | Count |
| Total Faculty | `GET /api/users?role=faculty&count=true` | Count |
| Total Departments | `GET /api/departments?count=true` | Count |
| Active Users | `GET /api/users?is_active=true&count=true` | Count |
| Inactive Users | `GET /api/users?is_active=false&count=true` | Count |
| Total Sections | `GET /api/sections?count=true` | Count |

---

## 4. Screen 3: User Management

**Path:** `/admin/users`
**Access:** `admin` only. All other roles see: "You don't have permission to view this page."

### Layout

```
+--- Sidebar ---+-----------------------------------------------+
| CEC Student   |  Users                 [Bulk Import] [+ Create]|
| Platform      |                                                |
| Dashboard     |  Search: [____________] Role: [All v] Status:[All v]
| Users      <- |                                                |
| Departments   |  +--------------------------------------------+|
| Assignments   |  | Name    Email       USN        Role  Status||
|               |  +--------------------------------------------+|
|               |  | Rahul   rahul@..  1CG21CS001  [Stu] [Act] :||
|               |  | Priya   priya@..  1CG21CS002  [Stu] [Act] :||
|               |  | Dr.Ram  ram@cec   --          [Fac] [Act] :||
|               |  | Admin   admin@..  --          [Adm] [Act] :||
|               |  +--------------------------------------------+|
|               |  Showing 1-25 of 1325      [< 1 2 3 ... 53 >] |
+---------------+------------------------------------------------+
```

### Table Columns

| Column | Content | Notes |
|--------|---------|-------|
| Name | User display name | Clickable -> opens edit modal |
| Email | User email address | Monospace font |
| USN | Student USN or `--` for non-students | Monospace |
| Department | Department code badge | e.g., `CSE`, `ISE` |
| Role | Role badge | Color-coded (see section 1) |
| Last Login | Relative timestamp ("2 hours ago") | `--` if never |
| Status | Active / Inactive badge | Green / Warning |
| Actions (triple-dot) | Dropdown: Edit, Reset Password, Deactivate/Reactivate | Deactivate shows red |

### Create User Modal

```
+---------------------------------------------+
| Create User                              X   |
+---------------------------------------------+
| Full Name *                                  |
| +---------------------------------------+   |
| | Rahul Sharma                          |   |
| +---------------------------------------+   |
|                                              |
| Email *                                      |
| +---------------------------------------+   |
| | rahul.sharma@cec.edu.in              |   |
| +---------------------------------------+   |
|                                              |
| Temporary Password *                         |
| +---------------------------------------+   |
| |                              eye      |   |
| +---------------------------------------+   |
|                                              |
| Role *                                       |
| +---------------------------------------+   |
| | Student                            v  |   |
| +---------------------------------------+   |
|                                              |
| --- Student-specific fields (shown if Student) ---
| USN *                                        |
| +---------------------------------------+   |
| | 1CG21CS001                            |   |
| +---------------------------------------+   |
|                                              |
| Department *         Section *               |
| +-----------------+  +-----------------+     |
| | CSE          v  |  | 3A           v  |     |
| +-----------------+  +-----------------+     |
|                                              |
| Semester *                                   |
| +-----------------+                          |
| | 3             v  |                         |
| +-----------------+                          |
|                                              |
|                  [Cancel]  [Create User]     |
+---------------------------------------------+
```

### Bulk Import Modal

```
+---------------------------------------------+
| Bulk Import Students                     X   |
+---------------------------------------------+
| Upload a CSV file with the following columns:|
| name, email, usn, department_code,           |
| semester, section                            |
|                                              |
| +---------------------------------------+   |
| |  Drag & drop CSV file here            |   |
| |  or click to browse                   |   |
| +---------------------------------------+   |
|                                              |
| [Download Template CSV]                      |
|                                              |
|                  [Cancel]  [Import]          |
+---------------------------------------------+
```

After import, show results:

```
+---------------------------------------------+
| Import Results                           X   |
+---------------------------------------------+
| Imported: 480 students                       |
| Skipped: 5 (duplicate emails)                |
| Errors: 3                                    |
|                                              |
| Errors:                                      |
| Row 12: Invalid USN format "ABC123"          |
| Row 45: Department "XYZ" not found           |
| Row 89: Missing required field "email"       |
|                                              |
| [Download Credentials CSV]  [Close]          |
+---------------------------------------------+
```

---

## 5. Screen 4: Department Management

**Path:** `/admin/departments`
**Access:** `admin` only

### Layout

```
+--- Sidebar ---+-----------------------------------------------+
| CEC Student   |  Departments                  [+ Create Dept]  |
| Platform      |                                                |
| Dashboard     |  +--------------------------------------------+|
| Users         |  | Code  Name                  Sections  Fac  ||
| Departments<- |  +--------------------------------------------+|
| Assignments   |  | CSE   Comp. Science & Engg    8       12  ||
|               |  | ISE   Info. Science & Engg    6        9  ||
|               |  | ECE   Electronics & Comm.     6        8  ||
|               |  | EEE   Electrical & Electr.    4        6  ||
|               |  | ME    Mechanical Engg          4        5  ||
|               |  | CE    Civil Engineering        4        4  ||
|               |  | AIML  AI & Machine Learning    4        6  ||
|               |  | MBA   Master of Bus. Admin     2        4  ||
|               |  +--------------------------------------------+|
+---------------+------------------------------------------------+
```

### Table Columns

| Column | Content |
|--------|---------|
| Code | Department code (clickable -> department detail) |
| Name | Full department name |
| Sections | Count of active sections |
| Faculty | Count of assigned faculty |
| Students | Count of enrolled students |
| Actions | Edit, Delete (if no students) |

### Create Department Modal

```
+---------------------------------------------+
| Create Department                        X   |
+---------------------------------------------+
| Department Code *                            |
| +---------------------------------------+   |
| | CSE                                   |   |
| +---------------------------------------+   |
| (uppercase letters only, 2-5 chars)          |
|                                              |
| Department Name *                            |
| +---------------------------------------+   |
| | Computer Science and Engineering      |   |
| +---------------------------------------+   |
|                                              |
|              [Cancel]  [Create Department]   |
+---------------------------------------------+
```

---

## 6. Screen 5: Section Detail

**Path:** `/admin/departments/{dept_id}/sections`
**Access:** `admin` only

### Layout

```
+--- Sidebar ---+-----------------------------------------------+
| CEC Student   |  <- Departments   CSE                          |
| Platform      |  Computer Science and Engineering              |
|               |                                                |
| Dashboard     |  -- Sections ---- [+ Add Section] -----------  |
| Users         |  +--------------------------------------------+|
| Departments<- |  | Name  Semester  Year     Students  Faculty ||
| Assignments   |  +--------------------------------------------+|
|               |  | A     3        2025-26    60       4       ||
|               |  | B     3        2025-26    58       4       ||
|               |  | A     5        2025-26    55       3       ||
|               |  | B     5        2025-26    52       3       ||
|               |  | A     7        2025-26    48       3       ||
|               |  +--------------------------------------------+|
|               |                                                |
|               |  -- Faculty ----------------------------------  |
|               |  +--------------------------------------------+|
|               |  | Name      Email         Sections Assigned  ||
|               |  +--------------------------------------------+|
|               |  | Dr. Ram   ram@cec..     3A, 3B             ||
|               |  | Prof. S   sunita@cec..  5A                 ||
|               |  +--------------------------------------------+|
+---------------+------------------------------------------------+
```

### Add Section Modal

```
+---------------------------------------------+
| Add Section                              X   |
+---------------------------------------------+
| Section Name *                               |
| +---------------------------------------+   |
| | A                                     |   |
| +---------------------------------------+   |
| (single letter or short identifier)          |
|                                              |
| Semester *                                   |
| +---------------------------------------+   |
| | 3                                  v  |   |
| +---------------------------------------+   |
| (1-8)                                        |
|                                              |
| Academic Year *                              |
| +---------------------------------------+   |
| | 2025-26                            v  |   |
| +---------------------------------------+   |
|                                              |
|                 [Cancel]  [Add Section]      |
+---------------------------------------------+
```

---

## 7. Screen 6: Faculty Assignment Management

**Path:** `/admin/faculty-assignments`
**Access:** `admin` only

### Layout

```
+--- Sidebar ---+-----------------------------------------------+
| CEC Student   |  Faculty Assignments          [+ New Assignment]|
| Platform      |                                                |
| Dashboard     |  Dept: [All v]  Faculty: [__________]          |
| Users         |                                                |
| Departments   |  +--------------------------------------------+|
| Assignments<- |  | Faculty    Dept  Section  Subject    Since :||
|               |  +--------------------------------------------+|
|               |  | Dr. Ram   CSE   3A       Data Str.  Jan 26:||
|               |  | Dr. Ram   CSE   3B       Data Str.  Jan 26:||
|               |  | Prof. S   CSE   5A       DBMS       Jan 26:||
|               |  | Prof. K   ISE   3A       OS         Feb 01:||
|               |  +--------------------------------------------+|
+---------------+------------------------------------------------+
```

### New Assignment Modal

```
+---------------------------------------------+
| Assign Faculty to Section                X   |
+---------------------------------------------+
| Faculty Member *                             |
| +---------------------------------------+   |
| | Search faculty...                     |   |
| +---------------------------------------+   |
|                                              |
| Department *                                 |
| +---------------------------------------+   |
| | CSE                                v  |   |
| +---------------------------------------+   |
|                                              |
| Section *                                    |
| +---------------------------------------+   |
| | 3rd Sem - Section A                v  |   |
| +---------------------------------------+   |
|                                              |
| Subject (optional)                           |
| +---------------------------------------+   |
| | Data Structures                       |   |
| +---------------------------------------+   |
|                                              |
|              [Cancel]  [Assign]              |
+---------------------------------------------+
```

---

## 8. Screen 7: Faculty Dashboard

**Path:** `/faculty/dashboard`
**Access:** `faculty` only

### Layout

```
+--- Sidebar ---+-----------------------------------------------+
| CEC Student   |  Welcome, Dr. Ramesh                           |
| Platform      |                                                |
| Dashboard  <- |  My Sections                                   |
| My Sections   |  +----------+ +----------+ +----------+       |
| Announcements |  | CSE-3A   | | CSE-3B   |                    |
|               |  | 3rd Sem  | | 3rd Sem  |                    |
|               |  | Data Str.| | Data Str.|                    |
|               |  | 60 stud. | | 58 stud. |                    |
|               |  | [View]   | | [View]   |                    |
|               |  +----------+ +----------+                    |
|               |                                                |
| ------------- |  Quick Actions                                 |
| Prof. Ramesh  |  [Mark Attendance]  [Enter Marks]              |
| [Logout]      |  [Post Announcement]                           |
+---------------+------------------------------------------------+
```

### Section Cards

Each card shows:
- Section identifier (e.g., CSE-3A)
- Semester
- Subject name (from assignment)
- Student count
- Quick link to section detail

---

## 9. Screen 8: Student Dashboard

**Path:** `/student/dashboard`
**Access:** `student` only

### Layout

```
+--- Sidebar ---+-----------------------------------------------+
| CEC Student   |  Welcome, Rahul Sharma                         |
| Platform      |  USN: 1CG21CS001 | CSE | 3rd Sem | Section A  |
|               |                                                |
| Dashboard  <- |  +----------+ +----------+ +----------+       |
| My Attendance |  | Attendance| | CGPA     | | Fees     |       |
| My Marks      |  |   78%    | |  8.2     | | Paid     |       |
| My Fees       |  | [View]   | | [View]   | | [View]   |       |
| Announcements |  +----------+ +----------+ +----------+       |
|               |                                                |
|               |  Recent Announcements                          |
|               |  +------------------------------------------+ |
|               |  | Jan 28: Mid-sem exam schedule released    | |
|               |  | Jan 25: Assignment 3 deadline extended    | |
|               |  +------------------------------------------+ |
| ------------- |                                                |
| Rahul Sharma  |  Upcoming                                      |
| [Logout]      |  +------------------------------------------+ |
|               |  | Feb 05: IA-2 Exam (Data Structures)       | |
|               |  +------------------------------------------+ |
+---------------+------------------------------------------------+
```

### Summary Cards

| Card | Source | Display |
|------|--------|---------|
| Attendance | `GET /api/students/me/attendance/summary` | Percentage with color (green >= 75%, warning < 75%, red < 65%) |
| CGPA | `GET /api/students/me/academics/cgpa` | Numeric value |
| Fees | `GET /api/students/me/fees/status` | "Paid" / "Pending" / "Overdue" badge |

---

## 10. Modified: Sidebar

### Role-conditional Navigation

| Nav Item | Visible to `admin` | Visible to `faculty` | Visible to `student` |
|----------|:---:|:---:|:---:|
| Dashboard | Yes | Yes | Yes |
| Users | Yes | No | No |
| Departments | Yes | No | No |
| Faculty Assignments | Yes | No | No |
| My Sections | No | Yes | No |
| Announcements | No | Yes | Yes |
| My Attendance | No | No | Yes |
| My Marks | No | No | Yes |
| My Fees | No | No | Yes |
| Reports | Yes | No | No |

### Sidebar Template

```
+----------------+
| CEC Student    |
| Platform       |
|                |
| [Dashboard]    |
|                |
| -- ADMIN ONLY --
| [Users]        |
| [Departments]  |
| [Assignments]  |
| [Reports]      |
|                |
| -- FACULTY --  |
| [My Sections]  |
| [Announcements]|
|                |
| -- STUDENT --  |
| [My Attendance]|
| [My Marks]     |
| [My Fees]      |
| [Announcements]|
|                |
| -------------- |
| User Name      |
| [role badge]   |
| [Logout ->]    |
+----------------+
```

### Sidebar States

- **Loading (skeleton):** While AuthContext is resolving, show placeholder bars.
- **Unauthenticated:** Sidebar does not render (route guard redirects to `/login` before page loads).
- **User info:** User name, role badge, and logout button at the bottom of the sidebar.

---

## 11. State Management and Data Fetching

### AuthContext

```typescript
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty' | 'student';
  department_id?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

### Data Fetching Pattern

All API calls use a shared `apiRequest` utility:
- Always includes `credentials: 'include'` for cookie support.
- Intercepts `401` and attempts token refresh before retrying.
- Throws typed `ApiError` for non-2xx responses.

### Toast Notifications

- Success: green toast for create/update/delete operations.
- Error: red toast for API errors.
- Auto-dismiss after 5 seconds.

---

## 12. Validation Rules

### Login Form

| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Required, valid email format | "Please enter a valid email address" |
| Password | Required | "Password is required" |

### Create User Form

| Field | Rule | Error Message |
|-------|------|---------------|
| Name | Required, 2-100 chars | "Name must be between 2 and 100 characters" |
| Email | Required, valid email, unique | "Please enter a valid email address" / "This email is already registered" |
| Password | Required, min 8 chars, 1 upper, 1 lower, 1 digit | "Password must be at least 8 characters with uppercase, lowercase, and digit" |
| Role | Required, one of: admin, faculty, student | "Please select a role" |
| USN (student) | Required, matches `^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$` | "Invalid USN format" |
| Department | Required for faculty/student | "Please select a department" |
| Section | Required for student | "Please select a section" |
| Semester | Required for student, 1-8 | "Semester must be between 1 and 8" |

### Department Form

| Field | Rule | Error Message |
|-------|------|---------------|
| Code | Required, 2-5 uppercase letters, unique | "Code must be 2-5 uppercase letters" |
| Name | Required, 3-100 chars | "Name must be between 3 and 100 characters" |

---

## 13. API Coverage Matrix

| Screen | API Endpoints Used |
|--------|-------------------|
| Login | `POST /api/auth/login` |
| Admin Dashboard | `GET /api/users?count=true`, `GET /api/departments?count=true`, `GET /api/sections?count=true` |
| User Management | `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `POST /api/users/bulk-import`, `PATCH /api/users/:id/reset-password` |
| Department Management | `GET /api/departments`, `POST /api/departments`, `PATCH /api/departments/:id`, `DELETE /api/departments/:id` |
| Section Detail | `GET /api/departments/:id/sections`, `POST /api/departments/:id/sections`, `DELETE /api/sections/:id` |
| Faculty Assignments | `GET /api/faculty-assignments`, `POST /api/faculty-assignments`, `DELETE /api/faculty-assignments/:id` |
| Faculty Dashboard | `GET /api/faculty/me/sections`, `GET /api/auth/me` |
| Student Dashboard | `GET /api/students/me/attendance/summary`, `GET /api/students/me/academics/cgpa`, `GET /api/students/me/fees/status`, `GET /api/auth/me` |
| Sidebar | `GET /api/auth/me` |
| All Pages | `POST /api/auth/logout`, `POST /api/auth/refresh` |
