from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

from app.config import settings
from app.database import engine, Base
from app.routers import auth, users, departments, sections, assignments, audit

# Import all models to ensure they are registered with Base for create_all()
from app.models.user import User  # noqa
from app.models.department import Department  # noqa
from app.models.section import Section  # noqa
from app.models.faculty_section_assignment import FacultySectionAssignment  # noqa
from app.models.audit_log import AuditLog  # noqa
from app.models.refresh_token import RefreshToken  # noqa

# Create tables
Base.metadata.create_all(bind=engine)

# No local limiter needed, use app.core.limiter

app = FastAPI(
    title="CEC Student Digital Platform",
    description="Student Lifecycle Management API - RBAC iteration",
    version="1.0.0",
)

app.state.limiter = limiter
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request, exc):
    """Custom 429 handler to match UC-RBAC-001 requirements."""
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many login attempts. Try again later.",
            "retry_after": 60
        },
        headers={"Retry-After": "60"}
    )

# CORS
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS.split(","),
        allow_credentials=True,  # Required for cookie-based auth
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok", "auth_enabled": settings.AUTH_ENABLED}

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(sections.router)
app.include_router(assignments.router)
app.include_router(audit.router)
app.include_router(assignments.faculty_router)
