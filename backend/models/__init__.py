# models package — import all table models here so SQLModel.metadata is populated
from backend.models.user import User, UserRole, UserRead
from backend.models.vehicle import Vehicle, VehicleStatus, VehicleCreate, VehicleUpdate, VehicleRead
from backend.models.driver import Driver, DriverStatus, DriverCreate, DriverUpdate, DriverRead
from backend.models.trip import Trip, TripStatus, TripCreate, TripRead
from backend.models.maintenance_log import MaintenanceLog, MaintenanceStatus, MaintenanceLogCreate, MaintenanceLogRead
from backend.models.fuel_log import FuelLog, FuelLogCreate, FuelLogRead
from backend.models.expense import Expense, ExpenseCreate, ExpenseRead
from backend.models.alert import Alert, AlertStatus, AlertCreate, AlertRead
from backend.models.prepost_trip_log import PrePostTripLog, LogType, PrePostTripLogCreate, PrePostTripLogRead

__all__ = [
    "User", "UserRole", "UserRead",
    "Vehicle", "VehicleStatus", "VehicleCreate", "VehicleUpdate", "VehicleRead",
    "Driver", "DriverStatus", "DriverCreate", "DriverUpdate", "DriverRead",
    "Trip", "TripStatus", "TripCreate", "TripRead",
    "MaintenanceLog", "MaintenanceStatus", "MaintenanceLogCreate", "MaintenanceLogRead",
    "FuelLog", "FuelLogCreate", "FuelLogRead",
    "Expense", "ExpenseCreate", "ExpenseRead",
    "Alert", "AlertStatus", "AlertCreate", "AlertRead",
    "PrePostTripLog", "LogType", "PrePostTripLogCreate", "PrePostTripLogRead",
]
