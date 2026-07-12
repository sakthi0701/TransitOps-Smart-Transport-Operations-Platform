from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import date


class DriverStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    OFF_DUTY = "Off Duty"
    SUSPENDED = "Suspended"


class Driver(SQLModel, table=True):
    """
    Fleet driver.
    experience_level 1-10: ≤3 = Beginner, ≥7 = Expert (used for mentor-pairing on long trips).
    """
    __tablename__ = "drivers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    license_number: str = Field(unique=True, index=True, max_length=50)
    license_expiry: date
    status: DriverStatus = Field(default=DriverStatus.AVAILABLE)
    safety_score: float = Field(default=50.0)           # 0–100
    inclination_factor: float = Field(default=50.0)     # 0–100, used by Agentic Dispatcher
    total_km_run: float = Field(default=0.0)            # Lifetime km; primary leaderboard factor
    experience_level: int = Field(default=5)            # 1–10


class DriverCreate(SQLModel):
    name: str
    license_number: str
    license_expiry: date
    status: DriverStatus = DriverStatus.AVAILABLE
    safety_score: float = 50.0
    inclination_factor: float = 50.0
    total_km_run: float = 0.0
    experience_level: int = 5


class DriverUpdate(SQLModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    status: Optional[DriverStatus] = None
    safety_score: Optional[float] = None
    inclination_factor: Optional[float] = None
    total_km_run: Optional[float] = None
    experience_level: Optional[int] = None


class DriverRead(SQLModel):
    id: int
    name: str
    license_number: str
    license_expiry: date
    status: DriverStatus
    safety_score: float
    inclination_factor: float
    total_km_run: float
    experience_level: int
    license_expired: bool = False   # Computed field, not stored — set by router on read
