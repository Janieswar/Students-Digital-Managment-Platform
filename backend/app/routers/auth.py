from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.core.security import (
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.core.audit import log_event
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.student_profile import StudentProfile
from app.models.faculty_profile import FacultyProfile
from app.models.department import Department
from app.models.section import Section
from sqlalchemy.orm import joinedload
from app.schemas.auth import LoginRequest, UserResponse
from app.core.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(body: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and issue JWT + refresh token cookies."""
    # Find user by email
    # Find user by email with profile info
    user = db.query(User).options(
        joinedload(User.student_profile).joinedload(StudentProfile.department),
        joinedload(User.student_profile).joinedload(StudentProfile.section),
        joinedload(User.faculty_profile).joinedload(FacultyProfile.department)
    ).filter(User.email == body.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled. Contact your administrator.")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate tokens
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    raw_refresh_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh_token)

    # Store refresh token hash in DB
    refresh_token_row = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
    )
    db.add(refresh_token_row)

    # Update last_login_at
    user.last_login_at = datetime.now(timezone.utc).isoformat()
    
    log_event(
        db=db,
        action="auth.login",
        actor_id=user.id,
        actor_name=user.name,
        actor_role=user.role,
        resource_type="auth",
        detail="User logged in successfully",
        ip_address=request.client.host if request.client else None
    )
    
    db.commit()

    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return user


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Revoke refresh token and clear cookies."""
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        token_hash = hash_refresh_token(raw_token)
        token_row = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at == None,
        ).first()
        if token_row:
            token_row.revoked_at = datetime.now(timezone.utc).isoformat()
            
            log_event(
                db=db,
                action="auth.logout",
                actor_id=current_user.id,
                actor_name=current_user.name,
                actor_role=current_user.role,
                resource_type="auth",
                detail="User logged out and refresh token revoked",
                ip_address=request.client.host if request.client else None
            )
            
            db.commit()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return Response(status_code=204)


@router.post("/refresh", response_model=UserResponse)
async def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Rotate refresh token and issue new access token."""
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    token_hash = hash_refresh_token(raw_token)
    token_row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not token_row:
        raise HTTPException(status_code=401, detail="Session invalid. Please log in again.")

    if token_row.revoked_at is not None:
        # Potential token theft/compromise. Invalidate ALL tokens for this user.
        from app.routers.users import _revoke_all_tokens
        _revoke_all_tokens(db, token_row.user_id)
        db.commit()
        raise HTTPException(status_code=401, detail="Session invalid. Please log in again.")

    if datetime.fromisoformat(token_row.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    # Revoke old token
    token_row.revoked_at = datetime.now(timezone.utc).isoformat()

    # Load user
    user = db.query(User).filter(User.id == token_row.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Issue new tokens
    new_access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    new_raw_refresh = generate_refresh_token()
    new_token_hash = hash_refresh_token(new_raw_refresh)

    new_token_row = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
    )
    db.add(new_token_row)
    
    log_event(
        db=db,
        action="auth.refresh",
        actor_id=user.id,
        actor_name=user.name,
        actor_role=user.role,
        resource_type="auth",
        detail="Session token refreshed",
        ip_address=request.client.host if request.client else None
    )
    
    db.commit()

    response.set_cookie(
        key="access_token", value=new_access_token, httponly=True,
        secure=settings.COOKIE_SECURE, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token", value=new_raw_refresh, httponly=True,
        secure=settings.COOKIE_SECURE, samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user with profile info."""
    # Re-fetch with joins to ensure profile is populated for the response model
    user = db.query(User).options(
        joinedload(User.student_profile).joinedload(StudentProfile.department),
        joinedload(User.student_profile).joinedload(StudentProfile.section),
        joinedload(User.faculty_profile).joinedload(FacultyProfile.department)
    ).filter(User.id == current_user.id).first()
    return user or current_user
