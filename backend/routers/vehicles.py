"""
Vehicle CRUD router.
Business rules enforced:
  - registration_number must be globally unique (DB constraint + friendly error)
  - Retired/In Shop vehicles are excluded from dispatch-eligible lists
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from backend.database import get_session
from backend.models.vehicle import Vehicle, VehicleCreate, VehicleUpdate, VehicleRead, VehicleStatus
from backend.routers.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=List[VehicleRead])
def list_vehicles(
    status: Optional[VehicleStatus] = Query(default=None, description="Filter by status"),
    type: Optional[str] = Query(default=None, description="Filter by vehicle type"),
    dispatchable: Optional[bool] = Query(default=None, description="If true, only Available vehicles"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[VehicleRead]:
    """
    Lists all vehicles. Optional filters:
    - status: Available | On Trip | In Shop | Retired
    - type: Truck | Van | Bus | Pickup etc.
    - dispatchable=true: only Available (not Retired, not In Shop)
    """
    query = select(Vehicle)

    if dispatchable:
        query = query.where(Vehicle.status == VehicleStatus.AVAILABLE)
    elif status:
        query = query.where(Vehicle.status == status)

    if type:
        query = query.where(Vehicle.type == type)

    vehicles = session.exec(query).all()
    return [VehicleRead.model_validate(v) for v in vehicles]


@router.post("/", response_model=VehicleRead, status_code=201)
def create_vehicle(
    payload: VehicleCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> VehicleRead:
    """Creates a new vehicle. Registration number must be unique."""
    # Sanitize input
    payload.registration_number = payload.registration_number.strip()

    existing = session.exec(
        select(Vehicle).where(Vehicle.registration_number == payload.registration_number)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Registration number '{payload.registration_number}' already exists.",
        )

    vehicle = Vehicle.model_validate(payload)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return VehicleRead.model_validate(vehicle)


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(
    vehicle_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> VehicleRead:
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return VehicleRead.model_validate(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> VehicleRead:
    """Partial update — only provided fields are changed."""
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "registration_number" in update_data and update_data["registration_number"] is not None:
        sanitized_reg = update_data["registration_number"].strip()
        update_data["registration_number"] = sanitized_reg
        
        # Check uniqueness against other vehicles
        existing = session.exec(
            select(Vehicle)
            .where(Vehicle.registration_number == sanitized_reg)
            .where(Vehicle.id != vehicle_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Registration number '{sanitized_reg}' is already in use by another vehicle.",
            )

    for key, value in update_data.items():
        setattr(vehicle, key, value)

    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return VehicleRead.model_validate(vehicle)


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> None:
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    session.delete(vehicle)
    session.commit()
