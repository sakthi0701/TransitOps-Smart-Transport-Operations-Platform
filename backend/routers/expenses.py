"""
Expenses router — track miscellaneous vehicle expenses (tolls, permits, etc.).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from backend.database import get_session
from backend.models.expense import Expense, ExpenseCreate, ExpenseRead
from backend.models.vehicle import Vehicle
from backend.routers.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/", response_model=ExpenseRead, status_code=201)
def create_expense(
    payload: ExpenseCreate,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> ExpenseRead:
    """Log a vehicle expense (toll, permit, other)."""
    if not session.get(Vehicle, payload.vehicle_id):
        raise HTTPException(status_code=404, detail=f"Vehicle {payload.vehicle_id} not found")

    expense = Expense(
        vehicle_id=payload.vehicle_id,
        type=payload.type,
        amount=payload.amount,
        date=payload.date,
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return ExpenseRead.model_validate(expense)


@router.get("/", response_model=List[ExpenseRead])
def list_expenses(
    vehicle_id: Optional[int] = Query(default=None, description="Filter by vehicle"),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[ExpenseRead]:
    """List all expenses, optionally filtered by vehicle."""
    query = select(Expense)
    if vehicle_id:
        query = query.where(Expense.vehicle_id == vehicle_id)
    expenses = session.exec(query).all()
    return [ExpenseRead.model_validate(e) for e in expenses]


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(
    expense_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> ExpenseRead:
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return ExpenseRead.model_validate(expense)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> None:
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()
