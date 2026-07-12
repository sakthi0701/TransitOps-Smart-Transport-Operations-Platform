from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date


class Expense(SQLModel, table=True):
    """Miscellaneous vehicle expense (toll, permit, etc.)."""
    __tablename__ = "expenses"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id")
    type: str = Field(max_length=100)   # e.g. "Toll", "Permit", "Other"
    amount: float
    date: date


class ExpenseCreate(SQLModel):
    vehicle_id: int
    type: str
    amount: float
    date: date


class ExpenseRead(SQLModel):
    id: int
    vehicle_id: int
    type: str
    amount: float
    date: date
