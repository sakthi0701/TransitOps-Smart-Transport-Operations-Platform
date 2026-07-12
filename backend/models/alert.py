from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class AlertStatus(str, Enum):
    UNREAD = "Unread"
    READ = "Read"


class Alert(SQLModel, table=True):
    """
    One-way dispatch alert: Fleet Manager → Driver.
    No WebSockets — Driver View polls GET /alerts?trip_id=X every 10s.
    """
    __tablename__ = "alerts"

    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trips.id")
    message: str = Field(max_length=500)
    status: AlertStatus = Field(default=AlertStatus.UNREAD)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AlertCreate(SQLModel):
    trip_id: int
    message: str


class AlertRead(SQLModel):
    id: int
    trip_id: int
    message: str
    status: AlertStatus
    timestamp: datetime
