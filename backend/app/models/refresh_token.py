import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    expires_at = Column(String, nullable=False)
    revoked_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("ix_refresh_tokens_user_id", "user_id"),
    )
