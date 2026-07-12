from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import date


class MaintenanceStatus(str, Enum):
    OPEN = "Open"
    CLOSED = "Closed"


class MaintenanceLog(SQLModel, table=True):
    """
    Maintenance record for a vehicle.
    Opening a record auto-switches vehicle to In Shop (enforced at API layer).
    Closing returns vehicle to Available (unless Retired).
    """
    __tablename__ = "maintenance_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id")
    type: str = Field(max_length=100)               # e.g. "Scheduled", "Breakdown", "Inspection"
    cost: float = Field(default=0.0)
    components_replaced: Optional[str] = Field(default=None)  # Free text list of parts
    total_cost: float = Field(default=0.0)
    date_logged: date
    status: MaintenanceStatus = Field(default=MaintenanceStatus.OPEN)


class MaintenanceLogCreate(SQLModel):
    vehicle_id: int
    type: str
    cost: float = 0.0
    components_replaced: Optional[str] = None
    total_cost: float = 0.0
    date_logged: date


class MaintenanceLogUpdate(SQLModel):
    type: Optional[str] = None
    cost: Optional[float] = None
    components_replaced: Optional[str] = None
    total_cost: Optional[float] = None
    status: Optional[MaintenanceStatus] = None


class MaintenanceLogRead(SQLModel):
    id: int
    vehicle_id: int
    type: str
    cost: float
    components_replaced: Optional[str]
    total_cost: float
    date_logged: date
    status: MaintenanceStatus
