# RBAC — Test Automation Guide

## Iteration: RBAC | pytest + httpx + Playwright

---

## Table of Contents

1. [Framework Stack](#1-framework-stack)
2. [Test Project Structure](#2-test-project-structure)
3. [Test Configuration](#3-test-configuration)
4. [Test Fixtures and Factories](#4-test-fixtures-and-factories)
5. [Unit Test Examples](#5-unit-test-examples)
6. [Integration Test Examples](#6-integration-test-examples)
7. [Security Test Examples](#7-security-test-examples)
8. [E2E Test Examples](#8-e2e-test-examples)
9. [CI Integration](#9-ci-integration)

---

## 1. Framework Stack

| Test Layer | Tool | Config File | When Runs |
|-----------|------|-------------|-----------|
| Unit | pytest | `pyproject.toml` [tool.pytest] | Every commit |
| Integration | pytest + httpx (TestClient) | `pyproject.toml` | Every commit |
| Security | pytest + httpx | `pyproject.toml` | Every commit |
| E2E | Playwright (Python) | `playwright.config.py` | Pre-release |
| Coverage | pytest-cov | `pyproject.toml` | Every commit |

### Install Test Dependencies

```bash
pip install pytest pytest-asyncio pytest-cov httpx playwright
playwright install chromium
```

---

## 2. Test Project Structure

```
backend/
├── tests/
│   ├── conftest.py                    # Shared fixtures (test DB, test client, test users)
│   ├── factories.py                   # User/department/section factory functions
│   ├── unit/
│   │   ├── test_permissions.py        # TC-UNIT-001 to TC-UNIT-015
│   │   ├── test_security.py           # TC-UNIT-020 to TC-UNIT-033
│   │   └── test_schemas.py            # TC-UNIT-040 to TC-UNIT-052
│   ├── integration/
│   │   ├── test_auth.py               # TC-INT-001 to TC-INT-016
│   │   ├── test_rbac.py               # TC-INT-020 to TC-INT-037
│   │   ├── test_users.py              # TC-INT-040 to TC-INT-057
│   │   ├── test_departments.py        # TC-INT-060 to TC-INT-071
│   │   └── test_assignments.py        # TC-INT-080 to TC-INT-089
│   ├── security/
│   │   └── test_security.py           # TC-SEC-001 to TC-SEC-015
│   ├── edge/
│   │   └── test_edge_cases.py         # TC-EDGE-001 to TC-EDGE-015
│   └── e2e/
│       └── test_browser_flows.py      # TC-E2E-001 to TC-E2E-010
```

---

## 3. Test Configuration

### pyproject.toml

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
asyncio_mode = "auto"
markers = [
    "unit: Unit tests (fast, no DB)",
    "integration: Integration tests (uses test DB)",
    "security: Security tests",
    "edge: Edge case tests",
    "e2e: Browser-based end-to-end tests",
]

[tool.coverage.run]
source = ["app"]
omit = ["app/seed.py", "tests/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
```

### Running Tests

```bash
# All tests
pytest

# By marker
pytest -m unit
pytest -m integration
pytest -m security
pytest -m edge
pytest -m e2e

# With coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Specific file
pytest tests/integration/test_auth.py -v

# Specific test
pytest tests/unit/test_permissions.py::test_admin_has_user_create -v
```

---

## 4. Test Fixtures and Factories

### conftest.py — Shared Fixtures

```python
# tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User
from app.models.department import Department
from app.models.section import Section
from app.models.student_profile import StudentProfile
from app.models.faculty_profile import FacultyProfile
from app.models.faculty_section_assignment import FacultySectionAssignment

# In-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def test_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Yield a database session for direct DB operations in tests."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """FastAPI test client with overridden DB dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def seed_data(db_session):
    """Create standard test data (see 09-test-cases.md § 2)."""
    # Departments
    cse = Department(id="dept-cse", code="CSE", name="Computer Science and Engineering")
    ise = Department(id="dept-ise", code="ISE", name="Information Science and Engineering")
    db_session.add_all([cse, ise])
    db_session.flush()

    # Sections
    cse_3a = Section(id="sec-cse-3a", department_id="dept-cse", name="A", semester=3, academic_year="2025-26")
    cse_3b = Section(id="sec-cse-3b", department_id="dept-cse", name="B", semester=3, academic_year="2025-26")
    cse_5a = Section(id="sec-cse-5a", department_id="dept-cse", name="A", semester=5, academic_year="2025-26")
    ise_3a = Section(id="sec-ise-3a", department_id="dept-ise", name="A", semester=3, academic_year="2025-26")
    db_session.add_all([cse_3a, cse_3b, cse_5a, ise_3a])
    db_session.flush()

    # Users
    password_hash = hash_password("TestPass@1")

    admin = User(id="user-admin", email="admin@cec.edu.in", password_hash=password_hash,
                 name="CEC Admin", role="admin", is_active=True)
    faculty1 = User(id="user-fac1", email="ramesh@cec.edu.in", password_hash=password_hash,
                    name="Dr. Ramesh Kumar", role="faculty", is_active=True)
    faculty2 = User(id="user-fac2", email="sunita@cec.edu.in", password_hash=password_hash,
                    name="Prof. Sunita Rao", role="faculty", is_active=True)
    faculty3 = User(id="user-fac3", email="anil@cec.edu.in", password_hash=password_hash,
                    name="Prof. Anil Kumar", role="faculty", is_active=True)
    student1 = User(id="user-stu1", email="rahul@cec.edu.in", password_hash=password_hash,
                    name="Rahul Sharma", role="student", is_active=True)
    student2 = User(id="user-stu2", email="priya@cec.edu.in", password_hash=password_hash,
                    name="Priya Patel", role="student", is_active=True)
    inactive = User(id="user-inactive", email="inactive@cec.edu.in", password_hash=password_hash,
                    name="Inactive User", role="student", is_active=False)

    db_session.add_all([admin, faculty1, faculty2, faculty3, student1, student2, inactive])
    db_session.flush()

    # Profiles
    db_session.add(FacultyProfile(user_id="user-fac1", employee_id="CEC-F-001", department_id="dept-cse"))
    db_session.add(FacultyProfile(user_id="user-fac2", employee_id="CEC-F-002", department_id="dept-cse"))
    db_session.add(FacultyProfile(user_id="user-fac3", employee_id="CEC-F-003", department_id="dept-ise"))
    db_session.add(StudentProfile(user_id="user-stu1", usn="1CG21CS001", department_id="dept-cse",
                                   section_id="sec-cse-3a", current_semester=3, academic_year="2025-26"))
    db_session.add(StudentProfile(user_id="user-stu2", usn="1CG21CS002", department_id="dept-cse",
                                   section_id="sec-cse-3b", current_semester=3, academic_year="2025-26"))
    db_session.add(StudentProfile(user_id="user-inactive", usn="1CG21CS099", department_id="dept-cse",
                                   section_id="sec-cse-3a", current_semester=3, academic_year="2025-26"))
    db_session.flush()

    # Faculty assignments
    db_session.add(FacultySectionAssignment(faculty_id="user-fac1", section_id="sec-cse-3a", subject="Data Structures"))
    db_session.add(FacultySectionAssignment(faculty_id="user-fac1", section_id="sec-cse-3b", subject="Data Structures"))
    db_session.add(FacultySectionAssignment(faculty_id="user-fac2", section_id="sec-cse-5a", subject="DBMS"))
    db_session.add(FacultySectionAssignment(faculty_id="user-fac3", section_id="sec-ise-3a", subject="Operating Systems"))
    db_session.commit()

    return {
        "admin": admin, "faculty1": faculty1, "faculty2": faculty2, "faculty3": faculty3,
        "student1": student1, "student2": student2, "inactive": inactive,
        "cse": cse, "ise": ise, "cse_3a": cse_3a, "cse_3b": cse_3b, "cse_5a": cse_5a, "ise_3a": ise_3a,
    }
```

### Helper: Login as User

```python
# tests/conftest.py (continued)

def login_as(client: TestClient, email: str, password: str = "TestPass@1") -> TestClient:
    """Log in as a user and return the client with cookies set."""
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return client  # Cookies are automatically stored in TestClient
```

---

## 5. Unit Test Examples

### Permission Map Tests

```python
# tests/unit/test_permissions.py

import pytest
from app.core.permissions import Permission, has_permission, has_all_permissions, ROLE_PERMISSIONS


class TestPermissionMap:
    """TC-UNIT-001 through TC-UNIT-015"""

    @pytest.mark.unit
    def test_admin_has_user_create(self):
        """TC-UNIT-001"""
        assert has_permission("admin", Permission.USER_CREATE) is True

    @pytest.mark.unit
    def test_admin_has_all_permissions(self):
        """TC-UNIT-002"""
        all_perms = list(Permission)
        assert has_all_permissions("admin", all_perms) is True

    @pytest.mark.unit
    def test_faculty_cannot_create_users(self):
        """TC-UNIT-003"""
        assert has_permission("faculty", Permission.USER_CREATE) is False

    @pytest.mark.unit
    def test_faculty_can_mark_attendance(self):
        """TC-UNIT-004"""
        assert has_permission("faculty", Permission.ATTENDANCE_MARK) is True

    @pytest.mark.unit
    def test_student_cannot_mark_attendance(self):
        """TC-UNIT-008"""
        assert has_permission("student", Permission.ATTENDANCE_MARK) is False

    @pytest.mark.unit
    def test_student_can_view_attendance(self):
        """TC-UNIT-007"""
        assert has_permission("student", Permission.ATTENDANCE_VIEW) is True

    @pytest.mark.unit
    def test_unknown_role_has_no_permissions(self):
        """TC-UNIT-012"""
        assert has_permission("unknown", Permission.USER_CREATE) is False

    @pytest.mark.unit
    def test_has_all_permissions_empty_list(self):
        """TC-UNIT-013"""
        assert has_all_permissions("student", []) is True
```

### Security Utility Tests

```python
# tests/unit/test_security.py

import pytest
from jose import JWTError
from app.core.security import (
    hash_password, verify_password, create_access_token,
    decode_access_token, generate_refresh_token, hash_refresh_token,
)


class TestPasswordHashing:
    """TC-UNIT-020 through TC-UNIT-023"""

    @pytest.mark.unit
    def test_hash_returns_bcrypt(self):
        """TC-UNIT-020"""
        h = hash_password("TestPass@1")
        assert h.startswith("$2b$")

    @pytest.mark.unit
    def test_verify_correct_password(self):
        """TC-UNIT-021"""
        h = hash_password("TestPass@1")
        assert verify_password("TestPass@1", h) is True

    @pytest.mark.unit
    def test_verify_wrong_password(self):
        """TC-UNIT-022"""
        h = hash_password("TestPass@1")
        assert verify_password("WrongPass", h) is False

    @pytest.mark.unit
    def test_two_hashes_differ(self):
        """TC-UNIT-023"""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # Different salts


class TestJWT:
    """TC-UNIT-024 through TC-UNIT-033"""

    @pytest.mark.unit
    def test_create_access_token_format(self):
        """TC-UNIT-024"""
        token = create_access_token({"sub": "123"})
        parts = token.split(".")
        assert len(parts) == 3

    @pytest.mark.unit
    def test_decode_returns_payload(self):
        """TC-UNIT-025"""
        token = create_access_token({"sub": "123", "email": "a@b.com", "role": "admin"})
        payload = decode_access_token(token)
        assert payload["sub"] == "123"
        assert payload["email"] == "a@b.com"

    @pytest.mark.unit
    def test_tampered_token_fails(self):
        """TC-UNIT-026"""
        token = create_access_token({"sub": "123"})
        tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
        with pytest.raises(JWTError):
            decode_access_token(tampered)

    @pytest.mark.unit
    def test_payload_includes_timestamps(self):
        """TC-UNIT-032"""
        token = create_access_token({"sub": "123"})
        payload = decode_access_token(token)
        assert "iat" in payload
        assert "exp" in payload
        assert "sub" in payload


class TestRefreshToken:
    """TC-UNIT-028 through TC-UNIT-031"""

    @pytest.mark.unit
    def test_generate_returns_64_hex(self):
        """TC-UNIT-028"""
        token = generate_refresh_token()
        assert len(token) == 64
        assert all(c in "0123456789abcdef" for c in token)

    @pytest.mark.unit
    def test_two_tokens_differ(self):
        """TC-UNIT-029"""
        assert generate_refresh_token() != generate_refresh_token()

    @pytest.mark.unit
    def test_hash_is_deterministic(self):
        """TC-UNIT-031"""
        assert hash_refresh_token("test") == hash_refresh_token("test")

    @pytest.mark.unit
    def test_hash_returns_64_chars(self):
        """TC-UNIT-030"""
        h = hash_refresh_token("test")
        assert len(h) == 64
```

---

## 6. Integration Test Examples

### Auth Flow Tests

```python
# tests/integration/test_auth.py

import pytest
from tests.conftest import login_as


class TestLogin:
    """TC-INT-001 through TC-INT-006"""

    @pytest.mark.integration
    def test_successful_login(self, client, seed_data):
        """TC-INT-001"""
        response = client.post("/api/auth/login", json={
            "email": "admin@cec.edu.in",
            "password": "TestPass@1",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@cec.edu.in"
        assert data["role"] == "admin"
        assert "password_hash" not in data

    @pytest.mark.integration
    def test_login_sets_cookies(self, client, seed_data):
        """TC-INT-002"""
        response = client.post("/api/auth/login", json={
            "email": "admin@cec.edu.in",
            "password": "TestPass@1",
        })
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    @pytest.mark.integration
    def test_wrong_password(self, client, seed_data):
        """TC-INT-003"""
        response = client.post("/api/auth/login", json={
            "email": "admin@cec.edu.in",
            "password": "WrongPassword",
        })
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"

    @pytest.mark.integration
    def test_nonexistent_email(self, client, seed_data):
        """TC-INT-004"""
        response = client.post("/api/auth/login", json={
            "email": "nobody@cec.edu.in",
            "password": "TestPass@1",
        })
        assert response.status_code == 401

    @pytest.mark.integration
    def test_inactive_account(self, client, seed_data):
        """TC-INT-005"""
        response = client.post("/api/auth/login", json={
            "email": "inactive@cec.edu.in",
            "password": "TestPass@1",
        })
        assert response.status_code == 401
        assert "disabled" in response.json()["detail"].lower()


class TestLogout:
    """TC-INT-007, TC-INT-008"""

    @pytest.mark.integration
    def test_successful_logout(self, client, seed_data):
        """TC-INT-007"""
        login_as(client, "admin@cec.edu.in")
        response = client.post("/api/auth/logout")
        assert response.status_code == 204


class TestMe:
    """TC-INT-009, TC-INT-010"""

    @pytest.mark.integration
    def test_me_authenticated(self, client, seed_data):
        """TC-INT-009"""
        login_as(client, "admin@cec.edu.in")
        response = client.get("/api/auth/me")
        assert response.status_code == 200
        assert response.json()["email"] == "admin@cec.edu.in"

    @pytest.mark.integration
    def test_me_unauthenticated(self, client, seed_data):
        """TC-INT-010"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
```

### RBAC Enforcement Tests

```python
# tests/integration/test_rbac.py

import pytest
from tests.conftest import login_as


class TestRBACEnforcement:
    """TC-INT-020 through TC-INT-037"""

    @pytest.mark.integration
    def test_admin_can_list_users(self, client, seed_data):
        """TC-INT-020"""
        login_as(client, "admin@cec.edu.in")
        response = client.get("/api/users")
        assert response.status_code == 200

    @pytest.mark.integration
    def test_faculty_cannot_list_users(self, client, seed_data):
        """TC-INT-021"""
        login_as(client, "ramesh@cec.edu.in")
        response = client.get("/api/users")
        assert response.status_code == 403

    @pytest.mark.integration
    def test_student_cannot_list_users(self, client, seed_data):
        """TC-INT-022"""
        login_as(client, "rahul@cec.edu.in")
        response = client.get("/api/users")
        assert response.status_code == 403

    @pytest.mark.integration
    def test_unauthenticated_cannot_access(self, client, seed_data):
        """TC-INT-023"""
        response = client.get("/api/users")
        assert response.status_code == 401
```

---

## 7. Security Test Examples

```python
# tests/security/test_security.py

import pytest
from app.core.security import create_access_token


class TestSecurityControls:
    """TC-SEC-001 through TC-SEC-015"""

    @pytest.mark.security
    def test_no_cookie_returns_401(self, client, seed_data):
        """TC-SEC-001"""
        endpoints = ["/api/users", "/api/auth/me", "/api/departments"]
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401, f"{endpoint} should return 401"

    @pytest.mark.security
    def test_tampered_jwt_returns_401(self, client, seed_data):
        """TC-SEC-002"""
        # Get a valid token first
        response = client.post("/api/auth/login", json={
            "email": "admin@cec.edu.in", "password": "TestPass@1"
        })
        token = response.cookies.get("access_token")
        # Tamper with it
        tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
        client.cookies.set("access_token", tampered)
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    @pytest.mark.security
    def test_password_hash_never_in_response(self, client, seed_data):
        """TC-SEC-007"""
        from tests.conftest import login_as
        login_as(client, "admin@cec.edu.in")

        # Check /me
        me = client.get("/api/auth/me").json()
        assert "password_hash" not in me

        # Check /users list
        users = client.get("/api/users").json()
        for user in users.get("items", []):
            assert "password_hash" not in user

    @pytest.mark.security
    def test_sql_injection_in_login(self, client, seed_data):
        """TC-SEC-008"""
        response = client.post("/api/auth/login", json={
            "email": "admin'--",
            "password": "anything",
        })
        # Should be 422 (invalid email) or 401, never 500
        assert response.status_code in [401, 422]
```

---

## 8. E2E Test Examples

```python
# tests/e2e/test_browser_flows.py

import pytest
from playwright.sync_api import Page, expect


BASE_URL = "http://localhost:5173"  # Vite dev server


@pytest.mark.e2e
class TestLoginFlow:
    """TC-E2E-001 through TC-E2E-003"""

    def test_admin_login_and_dashboard(self, page: Page):
        """TC-E2E-001"""
        page.goto(f"{BASE_URL}/login")
        page.fill('input[type="email"]', "admin@cec.edu.in")
        page.fill('input[type="password"]', "TestPass@1")
        page.click('button[type="submit"]')

        # Should redirect to admin dashboard
        page.wait_for_url(f"{BASE_URL}/admin/dashboard")
        expect(page.locator("h1")).to_contain_text("Dashboard")

    def test_student_login_and_dashboard(self, page: Page):
        """TC-E2E-003"""
        page.goto(f"{BASE_URL}/login")
        page.fill('input[type="email"]', "rahul@cec.edu.in")
        page.fill('input[type="password"]', "TestPass@1")
        page.click('button[type="submit"]')

        page.wait_for_url(f"{BASE_URL}/student/dashboard")
        expect(page.locator("h1")).to_contain_text("Welcome")

    def test_logout_flow(self, page: Page):
        """TC-E2E-007"""
        # Login first
        page.goto(f"{BASE_URL}/login")
        page.fill('input[type="email"]', "admin@cec.edu.in")
        page.fill('input[type="password"]', "TestPass@1")
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/admin/dashboard")

        # Logout
        page.click("text=Logout")
        page.wait_for_url(f"{BASE_URL}/login")

        # Verify cannot access protected route
        page.goto(f"{BASE_URL}/admin/dashboard")
        page.wait_for_url(f"{BASE_URL}/login")


@pytest.mark.e2e
class TestRBACUI:
    """TC-E2E-008, TC-E2E-009"""

    def test_student_cannot_access_admin_page(self, page: Page):
        """TC-E2E-008"""
        page.goto(f"{BASE_URL}/login")
        page.fill('input[type="email"]', "rahul@cec.edu.in")
        page.fill('input[type="password"]', "TestPass@1")
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/student/dashboard")

        page.goto(f"{BASE_URL}/admin/users")
        expect(page.locator("h1")).to_contain_text("403")
```

---

## 9. CI Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov httpx

      - name: Run unit tests
        run: |
          cd backend
          pytest -m unit --cov=app --cov-report=xml -v

      - name: Run integration tests
        run: |
          cd backend
          pytest -m integration --cov=app --cov-report=xml --cov-append -v

      - name: Run security tests
        run: |
          cd backend
          pytest -m security -v

      - name: Run edge case tests
        run: |
          cd backend
          pytest -m edge -v

      - name: Check coverage threshold
        run: |
          cd backend
          pytest --cov=app --cov-fail-under=80

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/htmlcov/
```

### Running All Tests Locally

```bash
cd backend

# Run all tests with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing -v

# Run only fast tests (unit + integration)
pytest -m "unit or integration" -v

# Run with parallel execution
pytest -n auto  # requires pytest-xdist
```
