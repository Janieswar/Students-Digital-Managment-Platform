import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Text
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String, nullable=True)           # user ID who performed the action
    actor_name = Column(String, nullable=True)          # user name at time of action
    actor_role = Column(String, nullable=True)          # role at time of action
    action = Column(String, nullable=False)             # e.g. "user.create", "login.success"
    resource_type = Column(String, nullable=True)       # e.g. "user", "department"
    resource_id = Column(String, nullable=True)         # ID of affected resource
    detail = Column(Text, nullable=True)                # human-readable description
    ip_address = Column(String, nullable=True)
    extra = Column(JSON, nullable=True)                 # arbitrary metadata
    created_at = Column(DateTime, default=datetime.utcnow)
