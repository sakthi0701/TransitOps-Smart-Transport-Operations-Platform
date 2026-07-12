from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date


class FuelLog(SQLModel, table=True):
    """Fuel fill-up record linked to a vehicle and optionally a trip."""
    __tablename__ = "fuel_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id")
    trip_id: Optional[int] = Field(default=None, foreign_key="trips.id")
    liters: float
    cost: float
    date: date


class FuelLogCreate(SQLModel):
    vehicle_id: int
    trip_id: Optional[int] = None
    liters: float
    cost: float
    date: date


class FuelLogRead(SQLModel):
    id: int
    vehicle_id: int
    trip_id: Optional[int]
    liters: float
    cost: float
    date: date
