"""
Seed script: creates the initial admin user.

Usage:
    python -m app.seed
"""

import os
import sys
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.config import settings

def seed():
    email = settings.SEED_ADMIN_EMAIL
    password = settings.SEED_ADMIN_PASSWORD

    if not email or not password:
        print("ERROR: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.admin).first()
        if existing:
            print(f"Admin user already exists: {existing.email}. Skipping.")
            return

        admin = User(
            email=email,
            password_hash=hash_password(password),
            name="CEC Admin",
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created: {email}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
