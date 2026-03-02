# RBAC — Migration & Cutover Plan

## Iteration: RBAC | Operational Runbook

---

## Table of Contents

1. [Pre-conditions](#1-pre-conditions)
2. [Step-by-Step Cutover Procedure](#2-step-by-step-cutover-procedure)
3. [Rollback Procedure](#3-rollback-procedure)
4. [Post-Cutover Monitoring](#4-post-cutover-monitoring)
5. [Communication Plan](#5-communication-plan)

---

## 1. Pre-conditions

Before starting the cutover, verify ALL of the following:

| # | Condition | How to Verify | Status |
|---|-----------|---------------|--------|
| 1 | All unit, integration, and security tests pass | `pytest --cov=app -v` — zero failures | [ ] |
| 2 | Coverage >= 80% on auth modules | `pytest --cov=app --cov-fail-under=80` | [ ] |
| 3 | Backend code is deployed (but auth is not enforced) | `GET /api/health` returns `{"status": "ok"}` | [ ] |
| 4 | Environment variables are set | `JWT_SECRET`, `DATABASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `CORS_ORIGINS` | [ ] |
| 5 | `AUTH_ENABLED` is set to `false` initially | Check env config | [ ] |
| 6 | Frontend build is ready (if deploying frontend in same cutover) | `npm run build` succeeds | [ ] |
| 7 | Backup of current database exists | `cp cec_student.db cec_student.db.backup.$(date +%Y%m%d)` | [ ] |

---

## 2. Step-by-Step Cutover Procedure

### Step 1: Deploy Backend with AUTH_ENABLED=false

**Purpose:** Deploy the new code with all auth modules included, but without enforcing authentication. This allows verifying the deployment without breaking existing functionality.

```bash
# Deploy backend (method depends on hosting platform)
# Ensure AUTH_ENABLED=false in environment

# Verify deployment
curl -s http://localhost:8000/api/health
# Expected: {"status": "ok", "auth_enabled": false}
```

**Verification:**
- [ ] `/api/health` returns 200.
- [ ] Existing endpoints still work without authentication.
- [ ] No errors in server logs.

**Estimated time:** 5 minutes

---

### Step 2: Run Database Migration

**Purpose:** Create the 7 new RBAC tables.

```bash
cd backend

# Run Alembic migration
alembic upgrade head

# Verify tables were created
sqlite3 cec_student.db ".tables"
# Expected: users refresh_tokens departments sections student_profiles faculty_profiles faculty_section_assignments
```

**Verification:**
- [ ] All 7 tables exist.
- [ ] No migration errors in output.
- [ ] Existing data (if any) is intact.

**Estimated time:** < 1 minute (empty database)

**If migration fails:**
```bash
# Check migration status
alembic history
alembic current

# Rollback if needed
alembic downgrade -1
```

---

### Step 3: Run Seed Script

**Purpose:** Create the initial admin user.

```bash
# Set environment variables
export SEED_ADMIN_EMAIL=admin@cec.edu.in
export SEED_ADMIN_PASSWORD=<secure-password>

# Run seed script
python -m app.seed
# Expected: "Admin user created: admin@cec.edu.in"
```

**Verification:**
- [ ] Script outputs success message.
- [ ] Admin user exists in database:
  ```bash
  sqlite3 cec_student.db "SELECT id, email, role, is_active FROM users WHERE role='admin';"
  ```

**Estimated time:** < 1 minute

---

### Step 4: Verify Auth Flow End-to-End (Guards Still Off)

**Purpose:** Test the auth endpoints work correctly before enabling enforcement.

```bash
# Test login
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cec.edu.in", "password": "<password>"}'
# Expected: 200 with user object

# Test /me endpoint with cookie
curl -b cookies.txt http://localhost:8000/api/auth/me
# Expected: 200 with admin user object

# Test token refresh
curl -b cookies.txt -X POST http://localhost:8000/api/auth/refresh
# Expected: 200

# Test logout
curl -b cookies.txt -X POST http://localhost:8000/api/auth/logout
# Expected: 204

# Test /me after logout
curl -b cookies.txt http://localhost:8000/api/auth/me
# Expected: 401 (token cleared)
```

**Verification:**
- [ ] Login returns 200 with user object.
- [ ] `/me` returns authenticated user.
- [ ] Refresh returns 200 with new tokens.
- [ ] Logout returns 204.
- [ ] `/me` returns 401 after logout.

**Estimated time:** 5 minutes

---

### Step 5: (Optional) Seed Departments and Test Data

**Purpose:** Create initial departments and a few test accounts for verification.

```bash
# Login as admin and create departments
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cec.edu.in", "password": "<password>"}'

# Create a department
curl -b cookies.txt -X POST http://localhost:8000/api/departments \
  -H "Content-Type: application/json" \
  -d '{"code": "CSE", "name": "Computer Science and Engineering"}'
# Expected: 201

# Create a section
curl -b cookies.txt -X POST http://localhost:8000/api/departments/{dept_id}/sections \
  -H "Content-Type: application/json" \
  -d '{"name": "A", "semester": 3, "academic_year": "2025-26"}'
# Expected: 201

# Create a test faculty user
curl -b cookies.txt -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test.faculty@cec.edu.in", "password": "TempPass@1", "name": "Test Faculty", "role": "faculty", "employee_id": "CEC-F-TEST", "department_id": "{dept_id}"}'
# Expected: 201

# Create a test student user
curl -b cookies.txt -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test.student@cec.edu.in", "password": "TempPass@1", "name": "Test Student", "role": "student", "usn": "1CG25CS001", "department_id": "{dept_id}", "section_id": "{section_id}", "current_semester": 3, "academic_year": "2025-26"}'
# Expected: 201
```

**Estimated time:** 10 minutes

---

### Step 6: Deploy Frontend (if applicable)

**Purpose:** Deploy the React frontend with login page and role-based routing.

```bash
cd frontend
npm run build
# Deploy the dist/ folder to hosting platform
```

**Verification:**
- [ ] Login page loads at `/login`.
- [ ] Admin can log in and see admin dashboard.
- [ ] Sidebar shows admin-only navigation items.
- [ ] Non-existent routes redirect to `/login`.

**Estimated time:** 5 minutes

---

### Step 7: CUTOVER — Enable AUTH_ENABLED=true

> **This is the point of no return for this session. After this step, all API endpoints require authentication.**

```bash
# Set AUTH_ENABLED=true
# Method depends on hosting platform:
# - Environment variable update
# - Config file change
# - Restart with new env

# Verify
curl -s http://localhost:8000/api/health
# Expected: {"status": "ok", "auth_enabled": true}

# Verify auth is enforced
curl -s http://localhost:8000/api/users
# Expected: 401 Unauthorized (no cookie)

# Verify admin still works
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cec.edu.in", "password": "<password>"}'
curl -b cookies.txt http://localhost:8000/api/users
# Expected: 200 with users list
```

**Verification:**
- [ ] `/api/health` shows `auth_enabled: true`.
- [ ] Unauthenticated requests return 401.
- [ ] Admin can still log in and access all endpoints.
- [ ] Faculty and student test accounts work with correct scoping.
- [ ] Frontend login flow works end-to-end.

**Estimated time:** 5 minutes

---

### Step 8: Notify Team

```
Subject: CEC Student Platform — RBAC Enabled
Body:
  Authentication and role-based access control is now active on the CEC Student Digital Platform.
  
  - All API endpoints now require login.
  - Admin account has been created (check secure channel for credentials).
  - Users must log in at /login to access the platform.
  
  If you experience any access issues, contact the admin immediately.
```

---

## 3. Rollback Procedure

### Option A: Fast Rollback — Disable Auth (< 1 minute)

If auth enforcement causes issues but the code itself is fine:

```bash
# Set AUTH_ENABLED=false
# Restart the server
# All endpoints are now accessible without auth again
```

This does NOT remove any data or tables. It simply bypasses auth checks.

### Option B: Full Rollback — Remove RBAC Code + Tables (15 minutes)

If the RBAC code itself is broken:

```bash
# 1. Set AUTH_ENABLED=false immediately (stop the bleeding)

# 2. Rollback database migration
cd backend
alembic downgrade -1
# This drops all 7 RBAC tables

# 3. Deploy previous version of backend code (without auth modules)
# Method depends on hosting platform (git revert, redeploy previous image, etc.)

# 4. Verify
curl -s http://localhost:8000/api/health
# Expected: 200 (old version, no auth)
```

### Option C: Data Recovery

If the migration corrupted existing data (unlikely — greenfield):

```bash
# Restore from backup
cp cec_student.db.backup.YYYYMMDD cec_student.db
# Restart server
```

---

## 4. Post-Cutover Monitoring

### Metrics to Watch (First 24 Hours)

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Login success rate | Server logs / audit trail | < 90% (indicates credential issues) |
| 401 error rate | Server logs | Sudden spike (may indicate token config issue) |
| 403 error rate | Server logs | Sustained high rate (may indicate misconfigured permissions) |
| 429 rate limit hits | Server logs | > 50/hour (may indicate attack or misconfigured client) |
| API response time | Server logs | > 500ms average (auth adding too much latency) |
| Server error rate (5xx) | Server logs | Any occurrence (indicates code bug) |

### Log Patterns to Watch

```bash
# Check for auth errors
grep "401\|403\|429" server.log | tail -50

# Check for unexpected 500s
grep "500" server.log

# Check login activity
grep "auth/login" server.log | tail -20

# Check rate limiting
grep "429" server.log | wc -l
```

### Success Criteria (24-hour mark)

- [ ] Zero 5xx errors related to auth.
- [ ] Login success rate > 95%.
- [ ] Admin, faculty, and student workflows function correctly.
- [ ] No user-reported access issues.
- [ ] Token refresh cycle works (user stays logged in > 15 min without re-entering password).

---

## 5. Communication Plan

### Pre-Cutover (1 day before)

| Audience | Channel | Message |
|----------|---------|---------|
| Development team | Team chat | "RBAC cutover scheduled for [date/time]. Auth will be enforced on all API endpoints. Test accounts will be created." |
| Admin staff | Email | "The student platform will require login starting [date]. Your admin credentials will be shared via secure channel." |

### During Cutover

| Audience | Channel | Message |
|----------|---------|---------|
| Development team | Team chat | "RBAC cutover in progress. Steps 1-7 executing. ETA: 30 minutes." |
| Development team | Team chat | "CUTOVER COMPLETE. AUTH_ENABLED=true. Monitoring for issues." |

### Post-Cutover (after 24 hours)

| Audience | Channel | Message |
|----------|---------|---------|
| All stakeholders | Email | "RBAC deployment successful. All users now require login. Admin can create accounts via /admin/users." |

### If Rollback

| Audience | Channel | Message |
|----------|---------|---------|
| Development team | Team chat (urgent) | "ROLLBACK: Auth disabled due to [issue]. Investigating. ETA for re-enable: [time]." |
| Admin staff | Email | "Temporary maintenance: Login requirement temporarily removed while we resolve an issue. Your data is safe." |

---

## Timeline Summary

| Step | Duration | Cumulative |
|------|----------|------------|
| 1. Deploy backend (auth off) | 5 min | 5 min |
| 2. Run migration | < 1 min | 6 min |
| 3. Seed admin | < 1 min | 7 min |
| 4. Verify auth flow | 5 min | 12 min |
| 5. Seed test data (optional) | 10 min | 22 min |
| 6. Deploy frontend | 5 min | 27 min |
| 7. **CUTOVER: Enable auth** | 5 min | 32 min |
| 8. Notify team | 2 min | 34 min |
| **Total** | | **~35 minutes** |
