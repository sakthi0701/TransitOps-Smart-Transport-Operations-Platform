"""
Seed script — populates the SQLite DB with realistic demo data.
Run once: python -m backend.seed
Seed users for judges:
  manager@demo.com / demo1234   → Manager
  driver@demo.com  / demo1234   → Dispatcher
  safety@demo.com  / demo1234   → Safety
  finance@demo.com / demo1234   → Finance
"""
import sys
import os

# Allow running as `python -m backend.seed` from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import date, timedelta
from sqlmodel import Session, select

from backend.database import engine, create_db_and_tables
import backend.models  # noqa: F401 — register all models

from backend.models.user import User, UserRole
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.models.driver import Driver, DriverStatus
from backend.auth.jwt import get_password_hash


def clear_tables(session: Session):
    """Clears existing data so seed is idempotent."""
    from backend.models.prepost_trip_log import PrePostTripLog
    from backend.models.alert import Alert
    from backend.models.fuel_log import FuelLog
    from backend.models.expense import Expense
    from backend.models.trip import Trip
    from backend.models.maintenance_log import MaintenanceLog
    from backend.models.driver import Driver
    from backend.models.vehicle import Vehicle
    from backend.models.user import User

    for model in [PrePostTripLog, Alert, FuelLog, Expense, Trip, MaintenanceLog, Driver, Vehicle, User]:
        rows = session.exec(select(model)).all()
        for row in rows:
            session.delete(row)
    session.commit()


def seed():
    create_db_and_tables()

    with Session(engine) as session:
        clear_tables(session)

        # ── Users ──────────────────────────────────────────────────────────────
        password = get_password_hash("demo1234")
        users = [
            User(email="manager@demo.com",  password_hash=password, role=UserRole.MANAGER),
            User(email="driver@demo.com",   password_hash=password, role=UserRole.DISPATCHER),
            User(email="safety@demo.com",   password_hash=password, role=UserRole.SAFETY),
            User(email="finance@demo.com",  password_hash=password, role=UserRole.FINANCE),
        ]
        for u in users:
            session.add(u)
        session.commit()

        # ── Vehicles ───────────────────────────────────────────────────────────
        vehicles = [
            Vehicle(registration_number="TN-01-AB-1234", model="Tata Ace Gold",    type="Mini Truck", max_capacity_kg=750,   odometer_km=12400, acquisition_cost=650000,  status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=18.5, breakdown_risk_score=12.0),
            Vehicle(registration_number="TN-02-BC-5678", model="Ashok Leyland 1616",type="Heavy Truck",max_capacity_kg=16000, odometer_km=87300, acquisition_cost=2800000, status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=7.2,  breakdown_risk_score=44.0),
            Vehicle(registration_number="TN-03-CD-9012", model="Eicher Pro 2049",   type="Medium Truck",max_capacity_kg=4900, odometer_km=34100, acquisition_cost=1200000, status=VehicleStatus.ON_TRIP,   optimal_mileage_kmpl=11.0, breakdown_risk_score=28.0),
            Vehicle(registration_number="TN-04-DE-3456", model="Force Traveller",   type="Van",        max_capacity_kg=1500, odometer_km=23000, acquisition_cost=850000,  status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=13.5, breakdown_risk_score=8.0),
            Vehicle(registration_number="TN-05-EF-7890", model="Mahindra Bolero Pickup",type="Pickup", max_capacity_kg=1000, odometer_km=9800,  acquisition_cost=900000,  status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=14.0, breakdown_risk_score=5.0),
            Vehicle(registration_number="TN-06-FG-2345", model="Volvo FM 440",      type="Heavy Truck",max_capacity_kg=25000,odometer_km=145000,acquisition_cost=7500000, status=VehicleStatus.IN_SHOP,   optimal_mileage_kmpl=5.8,  breakdown_risk_score=78.0),
            Vehicle(registration_number="TN-07-GH-6789", model="Tata LPT 1918",    type="Medium Truck",max_capacity_kg=9000, odometer_km=56200, acquisition_cost=1950000, status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=9.4,  breakdown_risk_score=31.0),
            Vehicle(registration_number="TN-08-HI-1234", model="Swaraj Mazda",     type="Mini Bus",   max_capacity_kg=2000, odometer_km=67400, acquisition_cost=1100000, status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=10.2, breakdown_risk_score=22.0),
            Vehicle(registration_number="TN-09-IJ-5678", model="Isuzu D-Max",      type="Pickup",     max_capacity_kg=1200, odometer_km=4200,  acquisition_cost=1350000, status=VehicleStatus.AVAILABLE, optimal_mileage_kmpl=15.5, breakdown_risk_score=2.0),
            Vehicle(registration_number="TN-10-JK-9012", model="Tata Ultra 1012",  type="Light Truck",max_capacity_kg=5000, odometer_km=31000, acquisition_cost=1600000, status=VehicleStatus.RETIRED,   optimal_mileage_kmpl=8.8,  breakdown_risk_score=91.0),
        ]
        for v in vehicles:
            session.add(v)
        session.commit()

        # ── Drivers ────────────────────────────────────────────────────────────
        today = date.today()
        drivers = [
            # Experts (experience_level >= 7)
            Driver(name="Rajan Murugesan",  license_number="TN-DL-001", license_expiry=today + timedelta(days=730), status=DriverStatus.AVAILABLE,  safety_score=88, inclination_factor=90, total_km_run=142000, experience_level=9),
            Driver(name="Suresh Pillai",    license_number="TN-DL-002", license_expiry=today + timedelta(days=365), status=DriverStatus.ON_TRIP,     safety_score=82, inclination_factor=75, total_km_run=98000,  experience_level=8),
            Driver(name="Arjun Krishnan",   license_number="TN-DL-003", license_expiry=today + timedelta(days=180), status=DriverStatus.AVAILABLE,  safety_score=91, inclination_factor=85, total_km_run=175000, experience_level=10),
            Driver(name="Muthu Swaminathan",license_number="TN-DL-004", license_expiry=today + timedelta(days=540), status=DriverStatus.AVAILABLE,  safety_score=76, inclination_factor=70, total_km_run=61000,  experience_level=7),
            # Mid-level (experience_level 4-6)
            Driver(name="Karthik Senthil",  license_number="TN-DL-005", license_expiry=today + timedelta(days=300), status=DriverStatus.AVAILABLE,  safety_score=70, inclination_factor=65, total_km_run=39000,  experience_level=5),
            Driver(name="Priya Lakshmi",    license_number="TN-DL-006", license_expiry=today + timedelta(days=420), status=DriverStatus.AVAILABLE,  safety_score=74, inclination_factor=68, total_km_run=27000,  experience_level=6),
            Driver(name="Venkat Raman",     license_number="TN-DL-007", license_expiry=today + timedelta(days=90),  status=DriverStatus.OFF_DUTY,   safety_score=68, inclination_factor=60, total_km_run=44000,  experience_level=5),
            Driver(name="Deepika Nair",     license_number="TN-DL-008", license_expiry=today + timedelta(days=600), status=DriverStatus.AVAILABLE,  safety_score=79, inclination_factor=80, total_km_run=52000,  experience_level=6),
            # Beginners (experience_level <= 3)
            Driver(name="Arun Selvam",      license_number="TN-DL-009", license_expiry=today + timedelta(days=730), status=DriverStatus.AVAILABLE,  safety_score=62, inclination_factor=55, total_km_run=5200,   experience_level=2),
            Driver(name="Meena Sundaram",   license_number="TN-DL-010", license_expiry=today + timedelta(days=550), status=DriverStatus.AVAILABLE,  safety_score=58, inclination_factor=50, total_km_run=3100,   experience_level=1),
            Driver(name="Balu Pandian",     license_number="TN-DL-011", license_expiry=today + timedelta(days=400), status=DriverStatus.AVAILABLE,  safety_score=65, inclination_factor=60, total_km_run=7800,   experience_level=3),
            # Suspended / Expired
            Driver(name="Raj Kumar",        license_number="TN-DL-012", license_expiry=today - timedelta(days=10),  status=DriverStatus.SUSPENDED,  safety_score=40, inclination_factor=30, total_km_run=21000,  experience_level=4),
        ]
        for d in drivers:
            session.add(d)
        session.commit()

        print("[OK] Seed complete!")
        print("\nDemo login credentials:")
        print("  manager@demo.com / demo1234  -> Manager")
        print("  driver@demo.com  / demo1234  -> Dispatcher")
        print("  safety@demo.com  / demo1234  -> Safety")
        print("  finance@demo.com / demo1234  -> Finance")


if __name__ == "__main__":
    seed()
