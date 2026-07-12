from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class LogType(str, Enum):
    PRE = "Pre"
    POST = "Post"


class PrePostTripLog(SQLModel, table=True):
    """
    Safety inspection log before and after a trip.
    damage_reported = True automatically triggers a maintenance review ticket (enforced at API layer).
    """
    __tablename__ = "prepost_trip_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trips.id")
    type: LogType
    notes: Optional[str] = Field(default=None, max_length=1000)
    damage_reported: bool = Field(default=False)
    logged_by_user_id: int = Field(foreign_key="users.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PrePostTripLogCreate(SQLModel):
    trip_id: int
    type: LogType
    notes: Optional[str] = None
    damage_reported: bool = False
    logged_by_user_id: int


class PrePostTripLogRead(SQLModel):
    id: int
    trip_id: int
    type: LogType
    notes: Optional[str]
    damage_reported: bool
    logged_by_user_id: int
    timestamp: datetime
