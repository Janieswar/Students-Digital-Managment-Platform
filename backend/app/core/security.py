import hashlib
import secrets
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with configured cost factor."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_COST)
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )



def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Sign a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def generate_refresh_token() -> str:
    """Generate a cryptographically secure random refresh token (64 hex chars)."""
    return secrets.token_hex(32)


def hash_refresh_token(token: str) -> str:
    """SHA-256 hash a refresh token for database storage."""
    return hashlib.sha256(token.encode()).hexdigest()
