from enum import Enum
from typing import Dict, List


class Permission(str, Enum):
    # User management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_BULK_IMPORT = "user:bulk_import"

    # Department management
    DEPARTMENT_MANAGE = "department:manage"
    SECTION_MANAGE = "section:manage"

    # Attendance (future)
    ATTENDANCE_MARK = "attendance:mark"
    ATTENDANCE_EDIT = "attendance:edit"
    ATTENDANCE_VIEW = "attendance:view"

    # Marks (future)
    MARKS_ENTER = "marks:enter"
    MARKS_EDIT = "marks:edit"
    MARKS_VIEW = "marks:view"

    # Announcements
    ANNOUNCEMENT_CREATE = "announcement:create"
    ANNOUNCEMENT_VIEW = "announcement:view"

    # Fees
    FEE_VIEW = "fee:view"
    FEE_MANAGE = "fee:manage"

    # Timetable
    TIMETABLE_MANAGE = "timetable:manage"
    TIMETABLE_VIEW = "timetable:view"

    # Reports
    REPORT_VIEW_ALL = "report:view_all"

    # Config
    CONFIG_MANAGE = "config:manage"

    # Student profile
    STUDENT_VIEW_PROFILE = "student:view_profile"


ROLE_PERMISSIONS: Dict[str, List[Permission]] = {
    "admin": [
        # Admin has ALL permissions
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_BULK_IMPORT,
        Permission.DEPARTMENT_MANAGE,
        Permission.SECTION_MANAGE,
        Permission.ATTENDANCE_MARK,
        Permission.ATTENDANCE_EDIT,
        Permission.ATTENDANCE_VIEW,
        Permission.MARKS_ENTER,
        Permission.MARKS_EDIT,
        Permission.MARKS_VIEW,
        Permission.ANNOUNCEMENT_CREATE,
        Permission.ANNOUNCEMENT_VIEW,
        Permission.FEE_VIEW,
        Permission.FEE_MANAGE,
        Permission.TIMETABLE_MANAGE,
        Permission.TIMETABLE_VIEW,
        Permission.REPORT_VIEW_ALL,
        Permission.CONFIG_MANAGE,
        Permission.STUDENT_VIEW_PROFILE,
    ],
    "faculty": [
        Permission.ATTENDANCE_MARK,
        Permission.ATTENDANCE_EDIT,
        Permission.ATTENDANCE_VIEW,
        Permission.MARKS_ENTER,
        Permission.MARKS_EDIT,
        Permission.MARKS_VIEW,
        Permission.ANNOUNCEMENT_CREATE,
        Permission.ANNOUNCEMENT_VIEW,
        Permission.TIMETABLE_VIEW,
        Permission.STUDENT_VIEW_PROFILE,
    ],
    "student": [
        Permission.ATTENDANCE_VIEW,   # own only
        Permission.MARKS_VIEW,        # own only
        Permission.ANNOUNCEMENT_VIEW,
        Permission.FEE_VIEW,          # own only
        Permission.TIMETABLE_VIEW,
        Permission.STUDENT_VIEW_PROFILE,  # own only
    ],
}


def has_permission(role: str, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def has_all_permissions(role: str, permissions: List[Permission]) -> bool:
    """Check if a role has all specified permissions."""
    role_perms = ROLE_PERMISSIONS.get(role, [])
    return all(p in role_perms for p in permissions)
