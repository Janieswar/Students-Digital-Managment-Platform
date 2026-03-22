from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/api/admin/audit-logs", tags=["audit"])


@router.get("")
async def list_audit_logs(
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """List audit log events. Admin only."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    total = query.count()
    items = (
        query
        .order_by(desc(AuditLog.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": e.id,
                "actor_name": e.actor_name,
                "actor_role": e.actor_role,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "detail": e.detail,
                "ip_address": e.ip_address,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in items
        ],
    }
