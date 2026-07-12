"""
Driver CRUD router.
Business rules enforced:
  - Expired license drivers are flagged on every GET response
  - Suspended/expired license drivers excluded from dispatch-eligible lists
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import date

from backend.database import get_session
from backend.models.driver import Driver, DriverCreate, DriverUpdate, DriverRead, DriverStatus
from backend.routers.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/drivers", tags=["drivers"])


def _enrich_driver(driver: Driver) -> DriverRead:
    """
    Converts a Driver DB row to DriverRead, setting the computed `license_expired` flag.
    This is checked on every read so the fleet manager always sees current expiry status.
    """
    data = driver.model_dump()
    data["license_expired"] = driver.license_expiry < date.today()
    return DriverRead(**data)


@router.get("/", response_model=List[DriverRead])
def list_drivers(
    status: Optional[DriverStatus] = Query(default=None),
    assignable: Optional[bool] = Query(default=None, description="If true, only Available + non-expired + non-suspended"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[DriverRead]:
    """
    Lists all drivers.
    - assignable=true: only Available drivers with valid (non-expired) licenses.
    """
    query = select(Driver)

    if assignable:
        today = date.today()
        query = (
            query
            .where(Driver.status == DriverStatus.AVAILABLE)
            .where(Driver.license_expiry >= today)
        )
    elif status:
        query = query.where(Driver.status == status)

    drivers = session.exec(query).all()
    return [_enrich_driver(d) for d in drivers]


@router.post("/", response_model=DriverRead, status_code=201)
def create_driver(
    payload: DriverCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> DriverRead:
    # Sanitize input
    payload.license_number = payload.license_number.strip()
    
    existing = session.exec(
        select(Driver).where(Driver.license_number == payload.license_number)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"License number '{payload.license_number}' already registered.",
        )

    driver = Driver.model_validate(payload)
    session.add(driver)
    session.commit()
    session.refresh(driver)
    return _enrich_driver(driver)


@router.get("/{driver_id}", response_model=DriverRead)
def get_driver(
    driver_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> DriverRead:
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return _enrich_driver(driver)


@router.put("/{driver_id}", response_model=DriverRead)
def update_driver(
    driver_id: int,
    payload: DriverUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> DriverRead:
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "license_number" in update_data and update_data["license_number"] is not None:
        sanitized_license = update_data["license_number"].strip()
        update_data["license_number"] = sanitized_license
        
        # Check uniqueness against other drivers
        existing = session.exec(
            select(Driver)
            .where(Driver.license_number == sanitized_license)
            .where(Driver.id != driver_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"License number '{sanitized_license}' is already in use by another driver.",
            )

    for key, value in update_data.items():
        setattr(driver, key, value)

    session.add(driver)
    session.commit()
    session.refresh(driver)
    return _enrich_driver(driver)


@router.delete("/{driver_id}", status_code=204)
def delete_driver(
    driver_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> None:
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    session.delete(driver)
    session.commit()
