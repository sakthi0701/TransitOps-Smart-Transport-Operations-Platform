"""
Trip lifecycle router.

Business rules enforced:
  1. cargo_weight_kg ≤ vehicle.max_capacity_kg
  2. Primary driver must be Available + valid license
  3. Secondary driver (if any) must be Available + valid license
  4. Vehicle must be Available (not In Shop / Retired / On Trip)
  5. No double-booking: driver/vehicle already On Trip → blocked
  6. planned_distance_km > 500 → requires Expert primary (≥7) + Beginner secondary (≤3)
  7. Cannot dispatch until is_safety_checklist_complete = True
  8. Dispatch → vehicle + driver(s) → On Trip
  9. Complete → vehicle + driver(s) → Available; odometer + km_run updated; risk recalculated
 10. Cancel → vehicle + driver(s) → Available
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from backend.database import get_session
from backend.models.trip import Trip, TripCreate, TripRead, TripStatus, TripCompletePayload
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.models.driver import Driver, DriverStatus
from backend.routers.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/trips", tags=["trips"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_trip_or_404(trip_id: int, session: Session) -> Trip:
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


def _get_vehicle_or_404(vehicle_id: int, session: Session) -> Vehicle:
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return vehicle


def _get_driver_or_404(driver_id: int, session: Session) -> Driver:
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail=f"Driver {driver_id} not found")
    return driver


def _validate_driver_assignable(driver: Driver, role: str = "Driver") -> None:
    """Raise 409 if driver cannot be assigned to a new trip."""
    today = date.today()
    if driver.status == DriverStatus.SUSPENDED:
        raise HTTPException(
            status_code=409,
            detail=f"{role} '{driver.name}' is Suspended and cannot be assigned."
        )
    if driver.status == DriverStatus.ON_TRIP:
        raise HTTPException(
            status_code=409,
            detail=f"{role} '{driver.name}' is already On Trip (double-booking blocked)."
        )
    if driver.license_expiry < today:
        raise HTTPException(
            status_code=409,
            detail=f"{role} '{driver.name}' has an expired license ({driver.license_expiry})."
        )


def _recalculate_risk_score(vehicle: Vehicle, cargo_weight_kg: float) -> float:
    """
    Simple heuristic risk score (0–100):
    - Odometer factor: older vehicles accumulate risk
    - Heavy load penalty: loads ≥ 90% of capacity add 20 points
    """
    odometer_factor = min((vehicle.odometer_km / 500_000) * 50, 50)
    heavy_load_penalty = 20 if (cargo_weight_kg >= 0.9 * vehicle.max_capacity_kg) else 0
    return min(odometer_factor + heavy_load_penalty, 100.0)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=TripRead, status_code=201)
def create_trip(
    payload: TripCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    """
    Create a new trip in Draft status.
    All business-rule validations are applied immediately on creation.
    """
    vehicle = _get_vehicle_or_404(payload.vehicle_id, session)
    primary = _get_driver_or_404(payload.primary_driver_id, session)

    # Rule 1 — Cargo weight check
    if payload.cargo_weight_kg > vehicle.max_capacity_kg:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cargo weight {payload.cargo_weight_kg} kg exceeds vehicle max capacity "
                f"{vehicle.max_capacity_kg} kg."
            ),
        )

    # Rule 3 — Vehicle must be Available
    if vehicle.status in (VehicleStatus.IN_SHOP, VehicleStatus.RETIRED):
        raise HTTPException(
            status_code=409,
            detail=f"Vehicle '{vehicle.registration_number}' is {vehicle.status.value} and unavailable for dispatch.",
        )
    if vehicle.status == VehicleStatus.ON_TRIP:
        raise HTTPException(
            status_code=409,
            detail=f"Vehicle '{vehicle.registration_number}' is already On Trip (double-booking blocked).",
        )

    # Rule 2 — Primary driver
    _validate_driver_assignable(primary, role="Primary driver")

    # Rule 6 — Long-haul mentor-pair requirement
    if payload.planned_distance_km > 500:
        if payload.secondary_driver_id is None:
            raise HTTPException(
                status_code=422,
                detail="Trips over 500 km require a secondary driver (Expert + Beginner mentor pair).",
            )
        if primary.experience_level < 7 and primary.experience_level > 3:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"For trips > 500 km, primary driver must be Expert (experience ≥7). "
                    f"'{primary.name}' has experience level {primary.experience_level}."
                ),
            )

    # Secondary driver validation (if provided)
    secondary = None
    if payload.secondary_driver_id:
        if payload.secondary_driver_id == payload.primary_driver_id:
            raise HTTPException(status_code=422, detail="Primary and secondary driver must be different people.")
        secondary = _get_driver_or_404(payload.secondary_driver_id, session)
        _validate_driver_assignable(secondary, role="Secondary driver")

        # Long-haul mentor pair: primary must be Expert (≥7), secondary must be Beginner (≤3)
        if payload.planned_distance_km > 500:
            if primary.experience_level < 7:
                raise HTTPException(
                    status_code=422,
                    detail=f"Long-haul primary driver must be Expert (experience ≥7). '{primary.name}' has level {primary.experience_level}.",
                )
            if secondary.experience_level > 3:
                raise HTTPException(
                    status_code=422,
                    detail=f"Long-haul secondary driver must be Beginner (experience ≤3). '{secondary.name}' has level {secondary.experience_level}.",
                )

    trip = Trip(
        source=payload.source,
        destination=payload.destination,
        primary_driver_id=payload.primary_driver_id,
        secondary_driver_id=payload.secondary_driver_id,
        vehicle_id=payload.vehicle_id,
        cargo_weight_kg=payload.cargo_weight_kg,
        planned_distance_km=payload.planned_distance_km,
        status=TripStatus.DRAFT,
        is_safety_checklist_complete=False,
        checkpoints_cleared=0,
    )
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return TripRead.model_validate(trip)


@router.get("/", response_model=List[TripRead])
def list_trips(
    status: Optional[TripStatus] = Query(default=None, description="Filter by status"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[TripRead]:
    """List all trips, optionally filtered by status."""
    query = select(Trip)
    if status:
        query = query.where(Trip.status == status)
    trips = session.exec(query).all()
    return [TripRead.model_validate(t) for t in trips]


@router.get("/{trip_id}", response_model=TripRead)
def get_trip(
    trip_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    return TripRead.model_validate(_get_trip_or_404(trip_id, session))


@router.put("/{trip_id}", response_model=TripRead)
def update_trip(
    trip_id: int,
    payload: TripCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    """Update a Draft trip. Cannot edit Dispatched/Completed/Cancelled trips."""
    trip = _get_trip_or_404(trip_id, session)
    if trip.status != TripStatus.DRAFT:
        raise HTTPException(status_code=409, detail="Only Draft trips can be edited.")

    # Re-run validations
    vehicle = _get_vehicle_or_404(payload.vehicle_id, session)
    if payload.cargo_weight_kg > vehicle.max_capacity_kg:
        raise HTTPException(
            status_code=422,
            detail=f"Cargo {payload.cargo_weight_kg} kg exceeds vehicle capacity {vehicle.max_capacity_kg} kg.",
        )

    trip.source = payload.source
    trip.destination = payload.destination
    trip.primary_driver_id = payload.primary_driver_id
    trip.secondary_driver_id = payload.secondary_driver_id
    trip.vehicle_id = payload.vehicle_id
    trip.cargo_weight_kg = payload.cargo_weight_kg
    trip.planned_distance_km = payload.planned_distance_km

    session.add(trip)
    session.commit()
    session.refresh(trip)
    return TripRead.model_validate(trip)


@router.post("/{trip_id}/checklist", response_model=TripRead)
def toggle_checklist(
    trip_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    """Toggle safety checklist completion on a Draft trip."""
    trip = _get_trip_or_404(trip_id, session)
    if trip.status != TripStatus.DRAFT:
        raise HTTPException(status_code=409, detail="Safety checklist can only be updated on Draft trips.")

    trip.is_safety_checklist_complete = not trip.is_safety_checklist_complete
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return TripRead.model_validate(trip)


@router.post("/{trip_id}/dispatch", response_model=TripRead)
def dispatch_trip(
    trip_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    """
    Move trip from Draft → Dispatched.
    Requires safety checklist complete.
    Flips vehicle + driver(s) to On Trip.
    """
    trip = _get_trip_or_404(trip_id, session)
    if trip.status != TripStatus.DRAFT:
        raise HTTPException(status_code=409, detail=f"Only Draft trips can be dispatched (current: {trip.status.value}).")

    # Rule 7 — checklist gate
    if not trip.is_safety_checklist_complete:
        raise HTTPException(
            status_code=409,
            detail="Pre-trip safety checklist must be completed before dispatching."
        )

    # Re-validate availability at dispatch time (could have changed since creation)
    vehicle = _get_vehicle_or_404(trip.vehicle_id, session)
    primary = _get_driver_or_404(trip.primary_driver_id, session)

    if vehicle.status != VehicleStatus.AVAILABLE:
        raise HTTPException(
            status_code=409,
            detail=f"Vehicle '{vehicle.registration_number}' is no longer Available (status: {vehicle.status.value}).",
        )
    _validate_driver_assignable(primary, role="Primary driver")

    # Rule 8 — Flip statuses to On Trip
    trip.status = TripStatus.DISPATCHED
    vehicle.status = VehicleStatus.ON_TRIP
    primary.status = DriverStatus.ON_TRIP

    session.add(vehicle)
    session.add(primary)

    if trip.secondary_driver_id:
        secondary = _get_driver_or_404(trip.secondary_driver_id, session)
        _validate_driver_assignable(secondary, role="Secondary driver")
        secondary.status = DriverStatus.ON_TRIP
        session.add(secondary)

    session.add(trip)
    session.commit()
    session.refresh(trip)
    return TripRead.model_validate(trip)


@router.post("/{trip_id}/complete", response_model=TripRead)
def complete_trip(
    trip_id: int,
    payload: TripCompletePayload,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    """
    Move trip from Dispatched → Completed.
    Requires actual_distance_km + fuel_consumed_liters.
    - Vehicle + driver(s) → Available
    - Vehicle odometer += actual_distance_km
    - Driver(s) total_km_run += actual_distance_km
    - Vehicle breakdown_risk_score recalculated
    """
    trip = _get_trip_or_404(trip_id, session)
    if trip.status != TripStatus.DISPATCHED:
        raise HTTPException(
            status_code=409,
            detail=f"Only Dispatched trips can be completed (current: {trip.status.value})."
        )

    vehicle = _get_vehicle_or_404(trip.vehicle_id, session)
    primary = _get_driver_or_404(trip.primary_driver_id, session)

    # Record actuals
    trip.actual_distance_km = payload.actual_distance_km
    trip.fuel_consumed_liters = payload.fuel_consumed_liters
    trip.status = TripStatus.COMPLETED

    # Rule 9 — Update odometer, km run
    vehicle.odometer_km += payload.actual_distance_km
    primary.total_km_run += payload.actual_distance_km

    # Recalculate breakdown risk score
    vehicle.breakdown_risk_score = _recalculate_risk_score(vehicle, trip.cargo_weight_kg)

    # Restore statuses
    vehicle.status = VehicleStatus.AVAILABLE
    primary.status = DriverStatus.AVAILABLE

    session.add(vehicle)
    session.add(primary)

    if trip.secondary_driver_id:
        secondary = _get_driver_or_404(trip.secondary_driver_id, session)
        secondary.total_km_run += payload.actual_distance_km
        secondary.status = DriverStatus.AVAILABLE
        session.add(secondary)

    session.add(trip)
    session.commit()
    session.refresh(trip)
    return TripRead.model_validate(trip)


@router.post("/{trip_id}/cancel", response_model=TripRead)
def cancel_trip(
    trip_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> TripRead:
    """
    Cancel a Dispatched (or Draft) trip.
    Restores vehicle + driver(s) to Available.
    """
    trip = _get_trip_or_404(trip_id, session)
    if trip.status not in (TripStatus.DRAFT, TripStatus.DISPATCHED):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel a {trip.status.value} trip."
        )

    # If it was dispatched, restore statuses
    if trip.status == TripStatus.DISPATCHED:
        vehicle = _get_vehicle_or_404(trip.vehicle_id, session)
        primary = _get_driver_or_404(trip.primary_driver_id, session)

        vehicle.status = VehicleStatus.AVAILABLE
        primary.status = DriverStatus.AVAILABLE
        session.add(vehicle)
        session.add(primary)

        if trip.secondary_driver_id:
            secondary = _get_driver_or_404(trip.secondary_driver_id, session)
            secondary.status = DriverStatus.AVAILABLE
            session.add(secondary)

    trip.status = TripStatus.CANCELLED
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return TripRead.model_validate(trip)


@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> None:
    """Delete a Draft trip only."""
    trip = _get_trip_or_404(trip_id, session)
    if trip.status != TripStatus.DRAFT:
        raise HTTPException(status_code=409, detail="Only Draft trips can be deleted.")
    session.delete(trip)
    session.commit()
