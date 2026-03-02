# RBAC — Frontend Implementation Guide

## Iteration: RBAC | React + Vite + TypeScript + Tailwind CSS + shadcn/ui

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Step 1: API Client Utility](#2-step-1-api-client-utility)
3. [Step 2: AuthContext](#3-step-2-authcontext)
4. [Step 3: Auth Hooks](#4-step-3-auth-hooks)
5. [Step 4: Route Protection](#5-step-4-route-protection)
6. [Step 5: Login Page](#6-step-5-login-page)
7. [Step 6: User Management Page](#7-step-6-user-management-page)
8. [Step 7: Department Management Page](#8-step-7-department-management-page)
9. [Step 8: Faculty Assignment Page](#9-step-8-faculty-assignment-page)
10. [Step 9: Faculty Dashboard](#10-step-9-faculty-dashboard)
11. [Step 10: Student Dashboard](#11-step-10-student-dashboard)
12. [Step 11: Update Sidebar](#12-step-11-update-sidebar)
13. [Step 12: 403 Forbidden Page](#13-step-12-403-forbidden-page)
14. [Step 13: Update Root Layout](#14-step-13-update-root-layout)

---

## 1. Prerequisites

### Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:8000
```

### Dependencies

```bash
npm install react-router-dom@6 @tanstack/react-query
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label card table dialog badge select toast tabs alert separator dropdown-menu skeleton
```

### File Structure

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                          # React Router setup
│   ├── lib/
│   │   └── api.ts                       # API client with refresh logic
│   ├── contexts/
│   │   └── AuthContext.tsx              # Auth state + provider
│   ├── hooks/
│   │   ├── useAuth.ts                   # Convenience hook
│   │   └── useApi.ts                    # API query hooks
│   ├── components/
│   │   ├── Sidebar.tsx                  # Role-conditional nav
│   │   ├── ProtectedRoute.tsx           # Route guard
│   │   ├── RoleBadge.tsx                # Color-coded role badge
│   │   └── Layout.tsx                   # Sidebar + content layout
│   ├── pages/
│   │   ├── login/
│   │   │   └── LoginPage.tsx
│   │   ├── admin/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── DepartmentsPage.tsx
│   │   │   └── AssignmentsPage.tsx
│   │   ├── faculty/
│   │   │   └── DashboardPage.tsx
│   │   ├── student/
│   │   │   └── DashboardPage.tsx
│   │   └── errors/
│   │       └── ForbiddenPage.tsx
│   └── types/
│       └── index.ts                     # TypeScript interfaces
├── .env
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 2. Step 1: API Client Utility

Shared fetch wrapper that handles cookies, token refresh, and error shaping.

```typescript
// src/lib/api.ts

const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.detail || "An error occurred");
  }

  return data as T;
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(401, "Session expired");
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",  // Always send cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If 401, attempt token refresh (once)
  if (response.status === 401 && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokens().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      // Retry original request
      const retryResponse = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      return handleResponse<T>(retryResponse);
    } catch {
      // Refresh also failed — redirect to login
      window.location.href = "/login";
      throw new ApiError(401, "Session expired. Please log in again.");
    }
  }

  return handleResponse<T>(response);
}

// Convenience methods
export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),

  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, {
      method: "POST",
      body: formData,
      headers: {},  // Let browser set Content-Type with boundary
    }),
};
```

---

## 3. Step 2: AuthContext

React Context that manages user state across the app.

```typescript
// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if user is already authenticated
  useEffect(() => {
    api
      .get<AuthUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    const userData = await api.post<AuthUser>("/api/auth/login", { email, password });
    setUser(userData);
    return userData;
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
```

---

## 4. Step 3: Auth Hooks

```typescript
// src/hooks/useAuth.ts

import { useAuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  return useAuthContext();
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  return { user, loading, isAuthenticated: !!user };
}

export function useRole() {
  const { user } = useAuth();
  return {
    isAdmin: user?.role === "admin",
    isFaculty: user?.role === "faculty",
    isStudent: user?.role === "student",
    role: user?.role,
  };
}
```

---

## 5. Step 4: Route Protection

```typescript
// src/components/ProtectedRoute.tsx

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
```

### Router Setup

```typescript
// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/login/LoginPage";
import { AdminDashboard } from "@/pages/admin/DashboardPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { DepartmentsPage } from "@/pages/admin/DepartmentsPage";
import { AssignmentsPage } from "@/pages/admin/AssignmentsPage";
import { FacultyDashboard } from "@/pages/faculty/DashboardPage";
import { StudentDashboard } from "@/pages/student/DashboardPage";
import { ForbiddenPage } from "@/pages/errors/ForbiddenPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Protected routes with layout */}
          <Route element={<Layout />}>
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>
            } />
            <Route path="/admin/departments" element={
              <ProtectedRoute allowedRoles={["admin"]}><DepartmentsPage /></ProtectedRoute>
            } />
            <Route path="/admin/assignments" element={
              <ProtectedRoute allowedRoles={["admin"]}><AssignmentsPage /></ProtectedRoute>
            } />

            {/* Faculty routes */}
            <Route path="/faculty/dashboard" element={
              <ProtectedRoute allowedRoles={["faculty"]}><FacultyDashboard /></ProtectedRoute>
            } />

            {/* Student routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>
            } />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## 6. Step 5: Login Page

See `04-ui-designs.md` § 2 for detailed layout.

```typescript
// src/pages/login/LoginPage.tsx

import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
};

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in — redirect to dashboard
  if (user) {
    return <Navigate to={ROLE_DASHBOARD[user.role] || "/"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await login(email, password);
      navigate(ROLE_DASHBOARD[userData.role] || "/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setError("Too many login attempts. Please try again in 60 seconds.");
        } else {
          setError(err.detail);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CEC Student Digital Platform</CardTitle>
          <CardDescription>City Engineering College, Bengaluru</CardDescription>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@cec.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

---

## 7. Step 6: User Management Page

Core page for admin. Shows user list, create modal, bulk import.

```typescript
// src/pages/admin/UsersPage.tsx

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { AuthUser, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/RoleBadge";
// ... other imports from shadcn/ui

export function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  async function fetchUsers() {
    const params = new URLSearchParams({
      page: String(page),
      page_size: "25",
    });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);

    const data = await api.get<PaginatedResponse<AuthUser>>(
      `/api/users?${params.toString()}`
    );
    setUsers(data.items);
    setTotal(data.total);
  }

  // ... render table with columns: Name, Email, USN, Dept, Role, Status, Actions
  // ... Create User modal
  // ... Bulk Import modal
  // See 04-ui-designs.md for full UI specification
}
```

> Full implementation follows the UI spec from `04-ui-designs.md` § 4 (User Management). Includes:
> - Paginated data table with search and role filter
> - Create User dialog with role-conditional fields (student: USN/dept/section; faculty: employee ID/dept)
> - Bulk Import dialog with CSV upload
> - Reset Password action
> - Deactivate/Reactivate toggle

---

## 8. Step 7: Department Management Page

```typescript
// src/pages/admin/DepartmentsPage.tsx

// Lists all departments with section counts
// Create department modal
// Click department -> inline section management
// See 04-ui-designs.md § 5 and § 6 for layouts
```

> Implementation pattern:
> - `GET /api/departments` -> render table
> - Create Department button -> dialog with code + name
> - Click row -> expand to show sections
> - Add Section button -> dialog within department context

---

## 9. Step 8: Faculty Assignment Page

```typescript
// src/pages/admin/AssignmentsPage.tsx

// Lists all faculty-section assignments
// Create assignment modal: select faculty, department, section, subject
// Delete assignment action
// See 04-ui-designs.md § 7 for layout
```

---

## 10. Step 9: Faculty Dashboard

```typescript
// src/pages/faculty/DashboardPage.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SectionAssignment {
  section_id: string;
  name: string;
  semester: number;
  department: { code: string; name: string };
  subject: string;
  student_count: number;
}

export function FacultyDashboard() {
  const { user } = useAuth();
  const [sections, setSections] = useState<SectionAssignment[]>([]);

  useEffect(() => {
    api.get<{ items: SectionAssignment[] }>("/api/faculty/me/sections")
      .then((data) => setSections(data.items));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name}</h1>

      <h2 className="text-xl font-semibold mb-4">My Sections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Card key={section.section_id}>
            <CardHeader>
              <CardTitle>{section.department.code}-{section.semester}{section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{section.subject}</p>
              <p className="text-sm">{section.student_count} students</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {sections.length === 0 && (
        <p className="text-muted-foreground">No sections assigned. Contact admin.</p>
      )}
    </div>
  );
}
```

---

## 11. Step 10: Student Dashboard

```typescript
// src/pages/student/DashboardPage.tsx

import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function StudentDashboard() {
  const { user } = useAuth();

  // Student profile data comes from /api/auth/me response
  const profile = user?.student_profile;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}</h1>
      {profile && (
        <p className="text-muted-foreground mb-6">
          USN: <span className="font-mono">{profile.usn}</span> |{" "}
          {profile.department?.code} | {profile.current_semester}th Sem | Section {profile.section?.name}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Available in next iteration</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>CGPA</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Available in next iteration</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fees</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Available in next iteration</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 12. Step 11: Update Sidebar

```typescript
// src/components/Sidebar.tsx

import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Admin
  { label: "Dashboard", path: "/admin/dashboard", roles: ["admin"] },
  { label: "Users", path: "/admin/users", roles: ["admin"] },
  { label: "Departments", path: "/admin/departments", roles: ["admin"] },
  { label: "Faculty Assignments", path: "/admin/assignments", roles: ["admin"] },
  // Faculty
  { label: "Dashboard", path: "/faculty/dashboard", roles: ["faculty"] },
  // Student
  { label: "Dashboard", path: "/student/dashboard", roles: ["student"] },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-primary text-primary-foreground min-h-screen flex flex-col">
      <div className="p-4 border-b border-primary-foreground/10">
        <h1 className="text-lg font-bold">CEC Student</h1>
        <p className="text-sm opacity-70">Digital Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-primary-foreground/20 font-medium" : "hover:bg-primary-foreground/10"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-foreground/10">
        <p className="text-sm font-medium">{user.name}</p>
        <RoleBadge role={user.role} className="mb-2" />
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start">
          Logout
        </Button>
      </div>
    </aside>
  );
}
```

### Layout Component

```typescript
// src/components/Layout.tsx

import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-muted/50">
        <Outlet />
      </main>
    </div>
  );
}
```

### RoleBadge Component

```typescript
// src/components/RoleBadge.tsx

import { Badge } from "@/components/ui/badge";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500 text-white",
  faculty: "bg-blue-500 text-white",
  student: "bg-green-500 text-white",
  hod: "bg-purple-500 text-white",
  principal: "bg-orange-500 text-white",
  parent: "bg-cyan-500 text-white",
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge className={`${ROLE_COLORS[role] || "bg-gray-500 text-white"} ${className || ""}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
```

---

## 13. Step 12: 403 Forbidden Page

```typescript
// src/pages/errors/ForbiddenPage.tsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
};

export function ForbiddenPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-destructive mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          You don't have permission to view this page.
        </p>
        <Button onClick={() => navigate(user ? ROLE_DASHBOARD[user.role] || "/" : "/login")}>
          {user ? "Go to Dashboard" : "Sign In"}
        </Button>
      </div>
    </div>
  );
}
```

---

## 14. Step 13: Update Root Layout

```typescript
// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### TypeScript Types

```typescript
// src/types/index.ts

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "faculty" | "student";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  student_profile?: StudentProfile;
  faculty_profile?: FacultyProfile;
}

export interface StudentProfile {
  usn: string;
  department: Department;
  section: Section;
  current_semester: number;
  academic_year: string;
}

export interface FacultyProfile {
  employee_id: string;
  department: Department;
  assigned_sections: SectionAssignment[];
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
  semester: number;
  academic_year: string;
  department_id: string;
}

export interface SectionAssignment {
  section_id: string;
  name: string;
  semester: number;
  department_code: string;
  subject: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```
