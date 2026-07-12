from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum


class TripStatus(str, Enum):
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class Trip(SQLModel, table=True):
    """
    Core operational entity.
    Business rules enforced at the API layer (not DB constraints):
    - cargo_weight_kg ≤ vehicle.max_capacity_kg
    - planned_distance_km > 500 requires Expert primary + Beginner secondary driver
    - Cannot move to Dispatched until is_safety_checklist_complete = True
    """
    __tablename__ = "trips"

    id: Optional[int] = Field(default=None, primary_key=True)
    source: str = Field(max_length=200)
    destination: str = Field(max_length=200)
    primary_driver_id: int = Field(foreign_key="drivers.id")
    secondary_driver_id: Optional[int] = Field(default=None, foreign_key="drivers.id")
    vehicle_id: int = Field(foreign_key="vehicles.id")
    cargo_weight_kg: float
    planned_distance_km: float
    actual_distance_km: Optional[float] = Field(default=None)
    fuel_consumed_liters: Optional[float] = Field(default=None)
    charge_amount: Optional[float] = Field(default=0.0)  # Amount charged to customer (₹) — real revenue
    status: TripStatus = Field(default=TripStatus.DRAFT)
    is_safety_checklist_complete: bool = Field(default=False)
    checkpoints_cleared: int = Field(default=0)


class TripCreate(SQLModel):
    source: str
    destination: str
    primary_driver_id: int
    secondary_driver_id: Optional[int] = None
    vehicle_id: int
    cargo_weight_kg: float
    planned_distance_km: float


class TripCompletePayload(SQLModel):
    """Payload for completing a trip — actual distance + fuel consumed + charge amount required."""
    actual_distance_km: float
    fuel_consumed_liters: float
    charge_amount: Optional[float] = 0.0  # Amount charged to customer (₹)


class TripRead(SQLModel):
    id: int
    source: str
    destination: str
    primary_driver_id: int
    secondary_driver_id: Optional[int]
    vehicle_id: int
    cargo_weight_kg: float
    planned_distance_km: float
    actual_distance_km: Optional[float]
    fuel_consumed_liters: Optional[float]
    charge_amount: Optional[float]
    status: TripStatus
    is_safety_checklist_complete: bool
    checkpoints_cleared: int
