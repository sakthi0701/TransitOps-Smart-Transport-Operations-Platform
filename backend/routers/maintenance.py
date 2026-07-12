"""
Maintenance log router.

Business rules enforced:
  - Creating a maintenance record → vehicle status automatically switches to In Shop
    AND breakdown_risk_score bumped to reflect known maintenance need.
  - Closing a maintenance record → vehicle status returns to Available (unless Retired)
    AND breakdown_risk_score recalculated (odometer-based, maintenance resets the wear factor).
  - Only Open records can be closed or deleted
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from backend.database import get_session
from backend.models.maintenance_log import (
    MaintenanceLog, MaintenanceLogCreate, MaintenanceLogUpdate,
    MaintenanceLogRead, MaintenanceStatus,
)
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.routers.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _get_log_or_404(log_id: int, session: Session) -> MaintenanceLog:
    log = session.get(MaintenanceLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return log


def _recalculate_risk_after_maintenance(vehicle: Vehicle) -> float:
    """
    Recalculate breakdown risk after maintenance is completed.
    Maintenance resets the recent-wear factor but the odometer still contributes.
    Formula mirrors trips.py _recalculate_risk_score but with no heavy-load penalty
    (since this is a post-maintenance baseline):
      odometer_factor = min((odometer_km / 500_000) * 40, 40)
    A freshly-serviced vehicle at 0 km odometer → 0 risk.
    A freshly-serviced vehicle at 500k km odometer → 40% risk (wear is structural).
    """
    return min((vehicle.odometer_km / 500_000) * 40, 40.0)


@router.post("/", response_model=MaintenanceLogRead, status_code=201)
def create_maintenance_log(
    payload: MaintenanceLogCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> MaintenanceLogRead:
    """
    Create a maintenance record and auto-flip vehicle status to In Shop.
    Also bumps breakdown_risk_score to signal a known issue (visible in Fleet UI).
    """
    vehicle = session.get(Vehicle, payload.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {payload.vehicle_id} not found")

    if vehicle.status == VehicleStatus.ON_TRIP:
        raise HTTPException(
            status_code=409,
            detail=f"Vehicle '{vehicle.registration_number}' is currently On Trip. Complete or cancel the trip first.",
        )

    # Rule 10 — vehicle → In Shop
    vehicle.status = VehicleStatus.IN_SHOP

    # ── Risk score update on open ─────────────────────────────────────────────
    # Opening a maintenance record means a problem has been identified.
    # Set risk to max(current, 60) so it's always visible as at least Medium risk.
    # This is the fix for the bug where risk score didn't update on maintenance log creation.
    vehicle.breakdown_risk_score = max(vehicle.breakdown_risk_score, 60.0)
    session.add(vehicle)

    log = MaintenanceLog(
        vehicle_id=payload.vehicle_id,
        type=payload.type,
        cost=payload.cost,
        components_replaced=payload.components_replaced,
        total_cost=payload.total_cost,
        date_logged=payload.date_logged,
        status=MaintenanceStatus.OPEN,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return MaintenanceLogRead.model_validate(log)


@router.get("/", response_model=List[MaintenanceLogRead])
def list_maintenance_logs(
    vehicle_id: Optional[int] = Query(default=None, description="Filter by vehicle"),
    status: Optional[MaintenanceStatus] = Query(default=None, description="Filter by status"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[MaintenanceLogRead]:
    """List maintenance records with optional filters."""
    query = select(MaintenanceLog)
    if vehicle_id:
        query = query.where(MaintenanceLog.vehicle_id == vehicle_id)
    if status:
        query = query.where(MaintenanceLog.status == status)
    logs = session.exec(query).all()
    return [MaintenanceLogRead.model_validate(l) for l in logs]


@router.get("/{log_id}", response_model=MaintenanceLogRead)
def get_maintenance_log(
    log_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> MaintenanceLogRead:
    return MaintenanceLogRead.model_validate(_get_log_or_404(log_id, session))


@router.put("/{log_id}", response_model=MaintenanceLogRead)
def update_maintenance_log(
    log_id: int,
    payload: MaintenanceLogUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> MaintenanceLogRead:
    """Update fields on an Open maintenance record."""
    log = _get_log_or_404(log_id, session)
    if log.status == MaintenanceStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Closed maintenance records cannot be edited.")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == MaintenanceStatus.CLOSED:
        vehicle = session.get(Vehicle, log.vehicle_id)
        if vehicle:
            if vehicle.status == VehicleStatus.IN_SHOP:
                if vehicle.status != VehicleStatus.RETIRED:
                    vehicle.status = VehicleStatus.AVAILABLE
            vehicle.breakdown_risk_score = 0.0
            session.add(vehicle)

    for key, value in update_data.items():
        setattr(log, key, value)

    session.add(log)
    session.commit()
    session.refresh(log)
    return MaintenanceLogRead.model_validate(log)


@router.post("/{log_id}/close", response_model=MaintenanceLogRead)
def close_maintenance_log(
    log_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> MaintenanceLogRead:
    """
    Close a maintenance record → vehicle status returns to Available (unless Retired).
    Rule 11 from PRD.
    Risk score is recalculated after maintenance: odometer-based baseline (no more wear reset to 0).
    """
    log = _get_log_or_404(log_id, session)
    if log.status == MaintenanceStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Maintenance record is already closed.")

    vehicle = session.get(Vehicle, log.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Associated vehicle not found")

    # Rule 11 — only restore to Available if not Retired
    if vehicle.status == VehicleStatus.IN_SHOP:
        vehicle.status = VehicleStatus.AVAILABLE

    # ── Risk score: post-maintenance recalculation ───────────────────────────────
    # Maintenance resolves the immediate issue, but odometer-based structural wear remains.
    # Formula: (odometer_km / 500_000) * 40 — capped at 40 (Green-Yellow boundary).
    vehicle.breakdown_risk_score = _recalculate_risk_after_maintenance(vehicle)
    session.add(vehicle)

    log.status = MaintenanceStatus.CLOSED
    session.add(log)
    session.commit()
    session.refresh(log)
    return MaintenanceLogRead.model_validate(log)


@router.delete("/{log_id}", status_code=204)
def delete_maintenance_log(
    log_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> None:
    """Delete an Open maintenance record. Also restores vehicle to Available."""
    log = _get_log_or_404(log_id, session)
    if log.status == MaintenanceStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Closed maintenance records cannot be deleted.")

    # If we're deleting an open record, restore vehicle to Available
    vehicle = session.get(Vehicle, log.vehicle_id)
    if vehicle and vehicle.status == VehicleStatus.IN_SHOP:
        vehicle.status = VehicleStatus.AVAILABLE
        session.add(vehicle)

    session.delete(log)
    session.commit()
