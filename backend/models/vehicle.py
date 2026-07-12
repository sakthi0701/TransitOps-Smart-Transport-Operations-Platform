from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum


class VehicleStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    IN_SHOP = "In Shop"
    RETIRED = "Retired"


class Vehicle(SQLModel, table=True):
    """Fleet vehicle. Registration number is globally unique."""
    __tablename__ = "vehicles"

    id: Optional[int] = Field(default=None, primary_key=True)
    registration_number: str = Field(unique=True, index=True, max_length=20)
    model: str = Field(max_length=100)
    type: str = Field(max_length=50)           # e.g. Truck, Van, Bus, Pickup
    max_capacity_kg: float
    odometer_km: float = Field(default=0.0)
    acquisition_cost: float
    status: VehicleStatus = Field(default=VehicleStatus.AVAILABLE)
    optimal_mileage_kmpl: float                 # Manufacturer-rated efficiency
    breakdown_risk_score: float = Field(default=0.0)   # 0–100, recalculated on trip complete


class VehicleCreate(SQLModel):
    registration_number: str
    model: str
    type: str
    max_capacity_kg: float
    odometer_km: float = 0.0
    acquisition_cost: float
    status: VehicleStatus = VehicleStatus.AVAILABLE
    optimal_mileage_kmpl: float
    breakdown_risk_score: float = 0.0


class VehicleUpdate(SQLModel):
    model: Optional[str] = None
    type: Optional[str] = None
    max_capacity_kg: Optional[float] = None
    odometer_km: Optional[float] = None
    acquisition_cost: Optional[float] = None
    status: Optional[VehicleStatus] = None
    optimal_mileage_kmpl: Optional[float] = None
    breakdown_risk_score: Optional[float] = None


class VehicleRead(SQLModel):
    id: int
    registration_number: str
    model: str
    type: str
    max_capacity_kg: float
    odometer_km: float
    acquisition_cost: float
    status: VehicleStatus
    optimal_mileage_kmpl: float
    breakdown_risk_score: float
