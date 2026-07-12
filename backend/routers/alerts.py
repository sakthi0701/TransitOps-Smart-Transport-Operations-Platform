"""
One-way Dispatch Alerts router (PRD Section 6.7).

Fleet Manager sends short priority messages tied to a trip_id.
Driver View polls GET /alerts?trip_id=X (no WebSockets needed).

Endpoints:
  POST   /alerts/           — Fleet Manager sends alert
  GET    /alerts/           — List alerts (optionally filtered by trip_id)
  PATCH  /alerts/{id}/read  — Driver marks alert as Read
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from backend.database import get_session
from backend.models.alert import Alert, AlertCreate, AlertRead, AlertStatus
from backend.models.trip import Trip
from backend.models.user import User
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/", response_model=AlertRead, status_code=201)
def send_alert(
    payload: AlertCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> AlertRead:
    """
    Fleet Manager sends a one-way text alert tied to a trip.
    The trip must exist (any status).
    """
    # Verify the trip exists
    trip = session.get(Trip, payload.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail=f"Trip {payload.trip_id} not found.")

    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="Alert message cannot be empty.")

    alert = Alert(
        trip_id=payload.trip_id,
        message=payload.message.strip(),
        status=AlertStatus.UNREAD,
    )
    session.add(alert)
    session.commit()
    session.refresh(alert)
    return AlertRead.model_validate(alert)


@router.get("/", response_model=List[AlertRead])
def list_alerts(
    trip_id: Optional[int] = Query(default=None, description="Filter alerts by trip ID"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[AlertRead]:
    """
    List alerts, optionally filtered by trip_id.
    Driver View calls this with ?trip_id=X every ~10 seconds to poll for new alerts.
    """
    query = select(Alert)
    if trip_id is not None:
        query = query.where(Alert.trip_id == trip_id)
    # Most recent first
    alerts = session.exec(query.order_by(Alert.id.desc())).all()  # type: ignore[attr-defined]
    return [AlertRead.model_validate(a) for a in alerts]


@router.patch("/{alert_id}/read", response_model=AlertRead)
def mark_alert_read(
    alert_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> AlertRead:
    """
    Mark an alert as Read (called from Driver View when driver dismisses the banner).
    """
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

    alert.status = AlertStatus.READ
    session.add(alert)
    session.commit()
    session.refresh(alert)
    return AlertRead.model_validate(alert)
