from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    MANAGER = "Manager"
    DISPATCHER = "Dispatcher"
    SAFETY = "Safety"
    FINANCE = "Finance"


class User(SQLModel, table=True):
    """Database table for authenticated users (Fleet Manager, Driver, Safety, Finance)."""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    password_hash: str
    role: UserRole


class UserRead(SQLModel):
    """API response shape — never exposes password_hash."""
    id: int
    email: str
    role: UserRole
