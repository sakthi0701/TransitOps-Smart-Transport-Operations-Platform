"""
Fuel log router — log fuel fill-ups linked to a vehicle and optionally a trip.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from backend.database import get_session
from backend.models.fuel_log import FuelLog, FuelLogCreate, FuelLogRead
from backend.models.vehicle import Vehicle
from backend.models.trip import Trip
from backend.routers.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/fuel", tags=["fuel"])


@router.post("/", response_model=FuelLogRead, status_code=201)
def create_fuel_log(
    payload: FuelLogCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> FuelLogRead:
    """Log a fuel fill-up for a vehicle."""
    if not session.get(Vehicle, payload.vehicle_id):
        raise HTTPException(status_code=404, detail=f"Vehicle {payload.vehicle_id} not found")

    if payload.trip_id and not session.get(Trip, payload.trip_id):
        raise HTTPException(status_code=404, detail=f"Trip {payload.trip_id} not found")

    log = FuelLog(
        vehicle_id=payload.vehicle_id,
        trip_id=payload.trip_id,
        liters=payload.liters,
        cost=payload.cost,
        date=payload.date,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return FuelLogRead.model_validate(log)


@router.get("/", response_model=List[FuelLogRead])
def list_fuel_logs(
    vehicle_id: Optional[int] = Query(default=None, description="Filter by vehicle"),
    trip_id: Optional[int] = Query(default=None, description="Filter by trip"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[FuelLogRead]:
    """List all fuel logs, optionally filtered by vehicle or trip."""
    query = select(FuelLog)
    if vehicle_id:
        query = query.where(FuelLog.vehicle_id == vehicle_id)
    if trip_id:
        query = query.where(FuelLog.trip_id == trip_id)
    logs = session.exec(query).all()
    return [FuelLogRead.model_validate(l) for l in logs]


@router.get("/{log_id}", response_model=FuelLogRead)
def get_fuel_log(
    log_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> FuelLogRead:
    log = session.get(FuelLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found")
    return FuelLogRead.model_validate(log)


@router.delete("/{log_id}", status_code=204)
def delete_fuel_log(
    log_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> None:
    log = session.get(FuelLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found")
    session.delete(log)
    session.commit()
