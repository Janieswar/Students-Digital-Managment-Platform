"""Audit logging service — call log_event() from any router to record admin actions."""
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_event(
    db: Session,
    action: str,
    *,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    actor_role: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Record an audit event to the database.

    Args:
        db: SQLAlchemy session
        action: dot-separated action string e.g. 'user.create', 'login.success'
        actor_id: ID of the user performing the action
        actor_name: Name of the user at time of action
        actor_role: Role of the user at time of action
        resource_type: Type of the affected resource (e.g. 'user', 'department')
        resource_id: ID of the affected resource
        detail: Human-readable description
        ip_address: Caller IP address
        extra: Any additional metadata as dict

    Returns:
        The created AuditLog record
    """
    entry = AuditLog(
        action=action,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
        ip_address=ip_address,
        extra=extra,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
