"""
Role-Based Access Control (RBAC) dependency factory.

Usage in a router:
    from backend.auth.rbac import require_roles
    from backend.models.user import UserRole

    @router.delete("/{id}", status_code=204)
    def delete_vehicle(
        ...,
        _: User = Depends(require_roles(UserRole.MANAGER)),
    ):
        ...

Role matrix (enforced here — kept in one place for easy demo explanation):

  GET (read) endpoints      → all roles (no restriction)
  Trip create/dispatch      → Manager, Dispatcher
  Trip complete/cancel      → Manager, Dispatcher
  Maintenance create/close  → Manager, Safety
  Fuel/Expense write        → Manager, Finance, Dispatcher
  DELETE (any resource)     → Manager only
"""
from fastapi import Depends, HTTPException
from backend.routers.auth import get_current_user
from backend.models.user import User, UserRole


def require_roles(*roles: UserRole):
    """
    Returns a FastAPI dependency that raises 403 if the current user's
    role is not in the allowed list.
    """
    allowed = set(roles)

    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            allowed_names = ", ".join(r.value for r in allowed)
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Access denied. This action requires one of: [{allowed_names}]. "
                    f"Your role is: {current_user.role.value}."
                ),
            )
        return current_user

    return _check
