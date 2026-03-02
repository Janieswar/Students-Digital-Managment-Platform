# RBAC — System Architecture & Flow Diagrams

## Iteration: RBAC | Visual Reference

> All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub, GitLab, and most modern markdown viewers.

---

## Table of Contents

1. [Component Architecture](#1-component-architecture)
2. [Database Entity-Relationship Diagram](#2-database-entity-relationship-diagram)
3. [Authentication Flow — Login](#3-authentication-flow--login)
4. [Authentication Flow — Protected Request](#4-authentication-flow--protected-request)
5. [Permission Resolution Flowchart](#5-permission-resolution-flowchart)
6. [Token Lifecycle State Diagram](#6-token-lifecycle-state-diagram)
7. [Department Access Resolution Diagram](#7-department-access-resolution-diagram)
8. [Role Hierarchy Diagram](#8-role-hierarchy-diagram)
9. [Frontend Route Protection Flow](#9-frontend-route-protection-flow)
10. [Cutover Deployment Sequence](#10-cutover-deployment-sequence)

---

## 1. Component Architecture

Shows all new modules alongside future ones and the dependency wires between them.

```mermaid
graph TB
    subgraph Frontend["React + Vite Frontend"]
        RG[React Router Guard\nRoute Protection]
        LP[/login\nLogin Page]
        AC[AuthContext\nUser State]
        SB[Sidebar.tsx\nRole-conditional nav]
        AD[/admin/dashboard\nAdmin Dashboard]
        FD[/faculty/dashboard\nFaculty Dashboard]
        SD[/student/dashboard\nStudent Dashboard]
        UMP[/admin/users\nUser Management]
        DMP[/admin/departments\nDept Management]
    end

    subgraph Backend["FastAPI Backend"]
        subgraph NEW["New Modules"]
            AR[auth/router.py\nlogin - logout - refresh - me]
            UR[users/router.py\nCRUD - bulk import]
            DR[departments/router.py\ndepartments - sections]
            FAR[assignments/router.py\nfaculty-section assignments]
        end

        subgraph MIDDLEWARE["Middleware & Dependencies"]
            RA[require_auth\nverifies JWT]
            RR[require_role\nrole check]
            RSA[require_section_access\ndepartment scoping]
            RSE[require_self_access\nstudent self-check]
        end

        subgraph FUTURE["Future Modules"]
            ATT[attendance/router.py\nmark - view - edit]
            ACA[academics/router.py\nmarks - grades]
            FEE[fees/router.py\npayments - status]
            ANN[announcements/router.py\ncreate - view]
        end
    end

    subgraph DB["SQLite Database"]
        subgraph NEWT["New Tables"]
            UT[(users)]
            RT[(refresh_tokens)]
            DT[(departments)]
            ST[(sections)]
            FSAT[(faculty_section_assignments)]
            SPT[(student_profiles)]
            FPT[(faculty_profiles)]
        end
        subgraph FUTURE_T["Future Tables"]
            ATT_T[(attendance_records)]
            MKT[(marks)]
            FEET[(fee_records)]
        end
    end

    RG -->|unauthenticated| LP
    AC -->|GET /auth/me| AR
    UMP --> UR
    DMP --> DR

    AR --> RA
    UR --> RA
    UR --> RR
    DR --> RA
    DR --> RR
    FAR --> RA
    FAR --> RR
    ATT --> RA
    ATT --> RSA
    ACA --> RA
    ACA --> RSA

    RA --> DB
    RR --> DB
    RSA --> DB
    AR --> DB
    UR --> DB
```

---

## 2. Database Entity-Relationship Diagram

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string password_hash
        string name
        string role
        boolean is_active
        datetime last_login_at
        datetime created_at
        datetime updated_at
    }

    RefreshToken {
        string id PK
        string user_id FK
        string token_hash
        datetime expires_at
        datetime revoked_at
        datetime created_at
    }

    Department {
        string id PK
        string code UK
        string name
        datetime created_at
    }

    Section {
        string id PK
        string department_id FK
        string name
        integer semester
        string academic_year
        datetime created_at
    }

    StudentProfile {
        string id PK
        string user_id FK
        string usn UK
        string department_id FK
        string section_id FK
        integer current_semester
        string academic_year
    }

    FacultyProfile {
        string id PK
        string user_id FK
        string employee_id UK
        string department_id FK
    }

    FacultySectionAssignment {
        string id PK
        string faculty_id FK
        string section_id FK
        string subject
        datetime assigned_at
    }

    User ||--o{ RefreshToken : "has"
    User ||--o| StudentProfile : "has"
    User ||--o| FacultyProfile : "has"
    Department ||--o{ Section : "has"
    Department ||--o{ StudentProfile : "enrolled in"
    Department ||--o{ FacultyProfile : "belongs to"
    Section ||--o{ StudentProfile : "placed in"
    Section ||--o{ FacultySectionAssignment : "assigned to"
    User ||--o{ FacultySectionAssignment : "teaches"
```

---

## 3. Authentication Flow — Login

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant RouterGuard as React Router Guard
    participant LoginPage as /login Page
    participant AuthAPI as POST /api/auth/login
    participant AuthService
    participant DB as SQLite

    User->>Browser: Navigate to /faculty/dashboard
    Browser->>RouterGuard: Check auth state
    RouterGuard->>RouterGuard: No access_token cookie
    RouterGuard-->>Browser: Redirect to /login
    Browser->>LoginPage: GET /login
    LoginPage-->>User: Render email + password form

    User->>Browser: Submit credentials
    Browser->>AuthAPI: POST /api/auth/login {email, password}
    AuthAPI->>AuthService: validate_user(email, password)
    AuthService->>DB: SELECT user WHERE email = ?
    DB-->>AuthService: User row (or null)

    alt User not found or inactive
        AuthService-->>AuthAPI: None
        AuthAPI-->>Browser: 401 {detail: "Invalid credentials"}
        Browser-->>User: Show error message
    else Wrong password
        AuthService->>AuthService: bcrypt.verify(password, hash) = false
        AuthService-->>AuthAPI: None
        AuthAPI-->>Browser: 401 {detail: "Invalid credentials"}
    else Valid credentials
        AuthService->>AuthService: bcrypt.verify(password, hash) = true
        AuthService-->>AuthAPI: user object
        AuthAPI->>AuthService: login(user)
        AuthService->>AuthService: sign JWT access token (15min)
        AuthService->>AuthService: generate refresh token (random 32 bytes)
        AuthService->>DB: INSERT refresh_tokens (hash of token, expires_at)
        AuthService-->>AuthAPI: {access_token, refresh_token, user}
        AuthAPI-->>Browser: 200 + Set-Cookie: access_token (httpOnly, 15min)\n         + Set-Cookie: refresh_token (httpOnly, 7d)
        Browser->>Browser: Store cookies (JS cannot access)
        Browser-->>User: Redirect to role-specific dashboard
    end
```

---

## 4. Authentication Flow — Protected Request

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Endpoint as Any API Endpoint
    participant RequireAuth as require_auth middleware
    participant RequireRole as require_role middleware
    participant ScopeCheck as require_section_access
    participant DB as SQLite

    User->>Browser: Click "View Attendance"
    Browser->>Endpoint: GET /api/sections/S1/attendance\n(cookie: access_token=jwt)

    Endpoint->>RequireAuth: Verify JWT
    RequireAuth->>RequireAuth: Decode JWT, check signature + expiry

    alt Token missing or invalid
        RequireAuth-->>Browser: 401 Unauthorized
        Browser-->>User: Redirect to /login
    else Token expired
        Browser->>Browser: Call POST /api/auth/refresh
        note right of Browser: Refresh flow re-issues access_token
        Browser->>Endpoint: Retry original request
    else Token valid
        RequireAuth-->>Endpoint: attach user to request.state
        Endpoint->>RequireRole: Check role permissions
        RequireRole->>RequireRole: ROLE_PERMISSIONS[user.role]\ncontains 'attendance:view'?

        alt Role lacks permission
            RequireRole-->>Browser: 403 Forbidden
        else Role has permission
            RequireRole-->>Endpoint: pass

            alt User is admin
                note over Endpoint: Admin bypasses scope check
                Endpoint-->>Browser: 200 OK + data
            else User is faculty
                Endpoint->>ScopeCheck: Check section assignment
                ScopeCheck->>DB: SELECT FROM faculty_section_assignments\nWHERE faculty_id=? AND section_id=?
                DB-->>ScopeCheck: Row found or null

                alt Not assigned
                    ScopeCheck-->>Browser: 403 Forbidden
                else Assigned
                    ScopeCheck-->>Endpoint: pass
                    Endpoint-->>Browser: 200 OK + data
                end
            else User is student
                Endpoint->>Endpoint: Verify student accessing own data
                alt Not own data
                    Endpoint-->>Browser: 403 Forbidden
                else Own data
                    Endpoint-->>Browser: 200 OK + data
                end
            end
        end
        Browser-->>User: Display data
    end
```

---

## 5. Permission Resolution Flowchart

```mermaid
flowchart TD
    START([Incoming request]) --> CHECK_JWT{Valid JWT\ncookie present?}
    CHECK_JWT -- No --> DENY_401([401 Unauthorized])
    CHECK_JWT -- Yes --> EXTRACT[Extract user from JWT\nrole, user_id]

    EXTRACT --> CHECK_ROLE{User role has\nrequired permission?}
    CHECK_ROLE -- No --> DENY_403([403 Forbidden])
    CHECK_ROLE -- Yes --> IS_ADMIN{User role\n== admin?}

    IS_ADMIN -- Yes --> ALLOW([Allow — admin bypass])

    IS_ADMIN -- No --> IS_FACULTY{User role\n== faculty?}
    IS_FACULTY -- Yes --> CHECK_SECTION[Query faculty_section_assignments\nWHERE faculty_id AND section_id]
    CHECK_SECTION --> SECTION_FOUND{Assignment\nfound?}
    SECTION_FOUND -- Yes --> ALLOW2([Allow])
    SECTION_FOUND -- No --> DENY_403_2([403 Forbidden])

    IS_FACULTY -- No --> IS_STUDENT{User role\n== student?}
    IS_STUDENT -- Yes --> CHECK_SELF{Accessing\nown records?}
    CHECK_SELF -- Yes --> ALLOW3([Allow])
    CHECK_SELF -- No --> DENY_403_3([403 Forbidden])

    IS_STUDENT -- No --> DENY_403_4([403 Forbidden — unknown role])
```

---

## 6. Token Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> AccessToken_Active : Login successful\nJWT signed (15min TTL)

    AccessToken_Active --> AccessToken_Expired : 15 minutes elapse
    AccessToken_Active --> [*] : Logout\n(client clears cookie)

    AccessToken_Expired --> AccessToken_Active : POST /auth/refresh\nwith valid refresh token\nnew access token issued
    AccessToken_Expired --> [*] : Refresh token also expired\nuser must log in again

    state RefreshToken {
        [*] --> RT_Active : Created on login\nStored as SHA-256 hash
        RT_Active --> RT_Used : POST /auth/refresh called
        RT_Used --> RT_Revoked : Old token revoked immediately\n(token rotation)
        RT_Active --> RT_Revoked : POST /auth/logout
        RT_Active --> RT_Expired : 7 days elapse
        RT_Revoked --> [*]
        RT_Expired --> [*]
    }

    note right of AccessToken_Active
        Stored in httpOnly cookie
        Cannot be read by JavaScript
        Payload: {sub, email, role, iat, exp}
    end note

    note right of RefreshToken
        Stored in httpOnly cookie (client)
        SHA-256 hash stored in DB (server)
        One-time use — rotation on every refresh
    end note
```

---

## 7. Department Access Resolution Diagram

Concrete example: Faculty assignments at CEC.

```mermaid
graph LR
    subgraph FACULTY["Faculty Members"]
        RAMESH[Prof. Ramesh\nCSE Department]
        SUNITA[Prof. Sunita\nCSE Department]
        KUMAR[Prof. Kumar\nISE Department]
    end

    subgraph ASSIGNMENTS["Section Assignments"]
        A1["CSE-3A\nData Structures"]
        A2["CSE-3B\nData Structures"]
        A3["CSE-5A\nDBMS"]
        A4["ISE-3A\nOperating Systems"]
    end

    subgraph ACCESS["Effective Access"]
        E1["Ramesh -> CSE-3A students\nattendance + marks"]
        E2["Ramesh -> CSE-3B students\nattendance + marks"]
        E3["Sunita -> CSE-5A students\nattendance + marks"]
        E4["Kumar -> ISE-3A students\nattendance + marks"]
        E5["Admin -> ALL sections\nfull access"]
    end

    RAMESH --> A1 --> E1
    RAMESH --> A2 --> E2
    SUNITA --> A3 --> E3
    KUMAR --> A4 --> E4

    style E5 fill:#fbbf24,color:#000
    style RAMESH fill:#3b82f6,color:#fff
    style SUNITA fill:#3b82f6,color:#fff
    style KUMAR fill:#6366f1,color:#fff
```

---

## 8. Role Hierarchy Diagram

```mermaid
graph TD
    subgraph SYSTEM["System Roles"]
        ADMIN[admin\nFull platform access\nUser management\nAll departments]
    end

    subgraph SCOPED["Department-Scoped Roles"]
        FACULTY[faculty\nAttendance + Marks\nAnnouncements\nAssigned sections only]
    end

    subgraph SELF["Self-Scoped Roles"]
        STUDENT[student\nView own attendance\nView own marks\nView own fees\nRead-only]
    end

    subgraph FUTURE["Future Roles (Phase 2+)"]
        HOD[hod\nDepartment-wide view\nFaculty oversight]
        PRINCIPAL[principal\nInstitution-wide view\nAll dashboards]
        PARENT[parent\nLinked student view\nAlerts only]
    end

    ADMIN -->|manages| FACULTY
    ADMIN -->|manages| STUDENT
    ADMIN -.->|future| HOD
    ADMIN -.->|future| PRINCIPAL
    HOD -.->|oversees| FACULTY
    PARENT -.->|views| STUDENT

    style ADMIN fill:#dc2626,color:#fff
    style FACULTY fill:#2563eb,color:#fff
    style STUDENT fill:#059669,color:#fff
    style HOD fill:#7c3aed,color:#fff
    style PRINCIPAL fill:#ea580c,color:#fff
    style PARENT fill:#0891b2,color:#fff
```

---

## 9. Frontend Route Protection Flow

```mermaid
flowchart TD
    subgraph ROUTER["React Router Guard (runs on every navigation)"]
        REQ([Navigation request]) --> CHECK_COOKIE{AuthContext\nhas user?}
        CHECK_COOKIE -- No --> IS_LOGIN{Path is\n/login?}
        IS_LOGIN -- Yes --> SERVE_LOGIN([Serve /login page])
        IS_LOGIN -- No --> REDIRECT_LOGIN([Redirect to /login])
        CHECK_COOKIE -- Yes --> IS_LOGIN2{Path is\n/login?}
        IS_LOGIN2 -- Yes --> REDIRECT_DASH([Redirect to role dashboard])
        IS_LOGIN2 -- No --> CHECK_ROUTE_ROLE{Route requires\nspecific role?}
        CHECK_ROUTE_ROLE -- No --> SERVE_PAGE([Serve page])
        CHECK_ROUTE_ROLE -- Yes --> HAS_ROLE{User has\nrequired role?}
        HAS_ROLE -- Yes --> SERVE_PAGE
        HAS_ROLE -- No --> SHOW_403([Show /403 page])
    end

    subgraph CLIENT["Client-side (after page load)"]
        SERVE_PAGE --> HYDRATE[AuthContext mounts\nGET /api/auth/me]
        HYDRATE --> ME_RESULT{/me response}
        ME_RESULT -- 200 user object --> STORE_USER[Store user in context\nRender role-conditional UI]
        ME_RESULT -- 401 expired --> REFRESH[POST /api/auth/refresh]
        REFRESH --> REFRESH_RESULT{Refresh result}
        REFRESH_RESULT -- 200 new token --> RETRY[Retry GET /api/auth/me]
        REFRESH_RESULT -- 401 failed --> FORCE_LOGIN[Clear state\nRedirect to /login]
    end
```

---

## 10. Cutover Deployment Sequence

```mermaid
sequenceDiagram
    actor Operator as DevOps Operator
    participant Backend as FastAPI Backend
    participant DB as SQLite
    participant Frontend as React Frontend

    Note over Operator,Frontend: Step 1: Deploy with AUTH_ENABLED=false
    Operator->>Backend: Deploy new code (auth modules included)
    Operator->>Backend: Set AUTH_ENABLED=false
    Operator->>Backend: Verify: GET /api/health -> 200

    Note over Operator,Frontend: Step 2: Run database migration
    Operator->>DB: alembic upgrade head
    Operator->>DB: Verify: 7 new tables created

    Note over Operator,Frontend: Step 3: Seed admin user
    Operator->>DB: python -m app.seed
    Operator->>DB: Verify: admin user exists

    Note over Operator,Frontend: Step 4: Verify auth flow (guards still off)
    Operator->>Backend: POST /api/auth/login (admin creds)
    Backend-->>Operator: 200 + cookies
    Operator->>Backend: GET /api/auth/me (with cookie)
    Backend-->>Operator: 200 + user object

    Note over Operator,Frontend: Step 5: Deploy frontend with auth UI
    Operator->>Frontend: Deploy React app with login page

    Note over Operator,Frontend: Step 6: CUTOVER - Enable auth
    Operator->>Backend: Set AUTH_ENABLED=true
    Operator->>Backend: Verify: GET /api/health -> 200
    Operator->>Backend: Verify: GET /api/users (no cookie) -> 401

    Note over Operator,Frontend: Step 7: Notify team
    Operator->>Operator: Send notification to all users
```
