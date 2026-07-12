"""
Analytics, Leaderboard, ROI, and Conversational Search router.
All calculations are based live on SQLite database records.
"""
import io
import csv
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.models.trip import Trip, TripStatus
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.models.driver import Driver, DriverStatus
from backend.models.maintenance_log import MaintenanceLog
from backend.models.fuel_log import FuelLog
from backend.models.expense import Expense
from backend.models.user import User
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class KpisRead(BaseModel):
    total_distance_km: float
    fleet_utilization_pct: float
    total_revenue: float
    total_operational_cost: float
    average_roi_pct: float


class FuelEfficiencyChartItem(BaseModel):
    registration_number: str
    model: str
    actual_mileage_kmpl: float
    optimal_mileage_kmpl: float


class CostTrendChartItem(BaseModel):
    vehicle_type: str
    fuel_cost: float
    maintenance_cost: float
    other_cost: float
    total_cost: float


class ChartsRead(BaseModel):
    fuel_efficiency: List[FuelEfficiencyChartItem]
    cost_trends: List[CostTrendChartItem]


class VehicleRoiItem(BaseModel):
    registration_number: str
    model: str
    type: str
    acquisition_cost: float
    fuel_cost: float
    maintenance_cost: float
    other_cost: float
    revenue: float
    net_profit: float
    roi_pct: float


class DriverLeaderboardItem(BaseModel):
    rank: int
    driver_id: int
    name: str
    total_km_run: float
    average_eco_ratio: float
    score: float
    reward_tier: str


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    answer: str
    data: Optional[List[dict]] = None
    columns: Optional[List[str]] = None


# ── Helper Calculation functions ───────────────────────────────────────────────

def _compute_trip_revenue(trip: Trip) -> float:
    """
    Revenue = trip.charge_amount (actual amount charged to customer).
    Falls back to the formula (km × 3.0) + (cargo × 0.5) only for legacy trips
    where charge_amount was not recorded (i.e., is None or 0).
    """
    if trip.status != TripStatus.COMPLETED or not trip.actual_distance_km:
        return 0.0
    if trip.charge_amount and trip.charge_amount > 0:
        return trip.charge_amount
    # Legacy fallback formula
    return (trip.actual_distance_km * 3.0) + (trip.cargo_weight_kg * 0.5)


def _compute_vehicle_costs(vehicle_id: int, session: Session):
    # Maintenance
    maint_cost = session.exec(
        select(MaintenanceLog.total_cost).where(MaintenanceLog.vehicle_id == vehicle_id)
    ).all()
    total_maint = sum(maint_cost) if maint_cost else 0.0

    # Fuel
    fuel_cost = session.exec(
        select(FuelLog.cost).where(FuelLog.vehicle_id == vehicle_id)
    ).all()
    total_fuel = sum(fuel_cost) if fuel_cost else 0.0

    # Other expenses
    other_cost = session.exec(
        select(Expense.amount).where(Expense.vehicle_id == vehicle_id)
    ).all()
    total_other = sum(other_cost) if other_cost else 0.0

    return total_fuel, total_maint, total_other


def _calculate_driver_eco_score(driver: Driver, session: Session):
    # Query all completed trips for this driver (primary or secondary)
    completed_trips = session.exec(
        select(Trip)
        .where((Trip.primary_driver_id == driver.id) | (Trip.secondary_driver_id == driver.id))
        .where(Trip.status == TripStatus.COMPLETED)
    ).all()

    eco_ratios = []
    for t in completed_trips:
        if not t.fuel_consumed_liters or t.fuel_consumed_liters <= 0 or not t.actual_distance_km:
            continue
        vehicle = session.get(Vehicle, t.vehicle_id)
        if vehicle and vehicle.optimal_mileage_kmpl > 0:
            actual_mileage = t.actual_distance_km / t.fuel_consumed_liters
            eco_ratio = actual_mileage / vehicle.optimal_mileage_kmpl
            eco_ratios.append(eco_ratio)

    avg_eco_ratio = sum(eco_ratios) / len(eco_ratios) if eco_ratios else 1.0
    # Driver Score = (total_km_run * 0.7) + (Eco-Ratio * 100 * 0.3)
    score = (driver.total_km_run * 0.7) + (avg_eco_ratio * 100 * 0.3)

    # Reward tier
    if score >= 80000:
        reward_tier = "Gold"
    elif score >= 30000:
        reward_tier = "Silver"
    elif score >= 5000:
        reward_tier = "Bronze"
    else:
        reward_tier = "Participant"

    return avg_eco_ratio, score, reward_tier


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/kpis", response_model=KpisRead)
def get_kpis(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> KpisRead:
    # 1. Total distance
    trips = session.exec(select(Trip).where(Trip.status == TripStatus.COMPLETED)).all()
    total_dist = sum((t.actual_distance_km for t in trips if t.actual_distance_km), 0.0)

    # 2. Fleet utilization
    vehicles = session.exec(select(Vehicle)).all()
    total_v = len(vehicles)
    active_v = sum(1 for v in vehicles if v.status == VehicleStatus.ON_TRIP)
    utilization = (active_v / total_v * 100.0) if total_v > 0 else 0.0

    # 3. Total revenue
    total_rev = sum(_compute_trip_revenue(t) for t in trips)

    # 4. Total operational cost
    maint_cost = sum(session.exec(select(MaintenanceLog.total_cost)).all())
    fuel_cost = sum(session.exec(select(FuelLog.cost)).all())
    other_cost = sum(session.exec(select(Expense.amount)).all())
    total_cost = maint_cost + fuel_cost + other_cost

    # 5. Average ROI
    roi_list = []
    for v in vehicles:
        if v.acquisition_cost <= 0:
            continue
        v_trips = [t for t in trips if t.vehicle_id == v.id]
        v_rev = sum(_compute_trip_revenue(t) for t in v_trips)
        vf, vm, vo = _compute_vehicle_costs(v.id, session)
        v_cost = vf + vm + vo
        net_profit = v_rev - v_cost
        roi = (net_profit / v.acquisition_cost) * 100.0
        roi_list.append(roi)

    avg_roi = sum(roi_list) / len(roi_list) if roi_list else 0.0

    return KpisRead(
        total_distance_km=round(total_dist, 1),
        fleet_utilization_pct=round(utilization, 1),
        total_revenue=round(total_rev, 2),
        total_operational_cost=round(total_cost, 2),
        average_roi_pct=round(avg_roi, 1),
    )


@router.get("/charts", response_model=ChartsRead)
def get_charts(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> ChartsRead:
    vehicles = session.exec(select(Vehicle)).all()
    completed_trips = session.exec(select(Trip).where(Trip.status == TripStatus.COMPLETED)).all()

    # 1. Fuel efficiency chart data
    fuel_efficiency = []
    for v in vehicles:
        v_trips = [t for t in completed_trips if t.vehicle_id == v.id]
        total_dist = sum((t.actual_distance_km for t in v_trips if t.actual_distance_km), 0.0)
        total_liters = sum((t.fuel_consumed_liters for t in v_trips if t.fuel_consumed_liters), 0.0)
        actual_mileage = (total_dist / total_liters) if total_liters > 0 else 0.0

        fuel_efficiency.append(
            FuelEfficiencyChartItem(
                registration_number=v.registration_number,
                model=v.model,
                actual_mileage_kmpl=round(actual_mileage, 2),
                optimal_mileage_kmpl=v.optimal_mileage_kmpl,
            )
        )

    # 2. Cost trends by vehicle type
    types = list(set(v.type for v in vehicles))
    cost_trends = []
    for t in types:
        v_ids = [v.id for v in vehicles if v.type == t]
        if not v_ids:
            continue
        fuel_c = sum(session.exec(select(FuelLog.cost).where(FuelLog.vehicle_id.in_(v_ids))).all())
        maint_c = sum(session.exec(select(MaintenanceLog.total_cost).where(MaintenanceLog.vehicle_id.in_(v_ids))).all())
        other_c = sum(session.exec(select(Expense.amount).where(Expense.vehicle_id.in_(v_ids))).all())

        cost_trends.append(
            CostTrendChartItem(
                vehicle_type=t,
                fuel_cost=round(fuel_c, 2),
                maintenance_cost=round(maint_c, 2),
                other_cost=round(other_c, 2),
                total_cost=round(fuel_c + maint_c + other_c, 2),
            )
        )

    return ChartsRead(fuel_efficiency=fuel_efficiency, cost_trends=cost_trends)


@router.get("/roi", response_model=List[VehicleRoiItem])
def get_roi_table(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[VehicleRoiItem]:
    vehicles = session.exec(select(Vehicle)).all()
    completed_trips = session.exec(select(Trip).where(Trip.status == TripStatus.COMPLETED)).all()

    result = []
    for v in vehicles:
        v_trips = [t for t in completed_trips if t.vehicle_id == v.id]
        revenue = sum(_compute_trip_revenue(t) for t in v_trips)
        fuel_c, maint_c, other_c = _compute_vehicle_costs(v.id, session)
        net_profit = revenue - (fuel_c + maint_c + other_c)
        roi_pct = (net_profit / v.acquisition_cost * 100.0) if v.acquisition_cost > 0 else 0.0

        result.append(
            VehicleRoiItem(
                registration_number=v.registration_number,
                model=v.model,
                type=v.type,
                acquisition_cost=v.acquisition_cost,
                fuel_cost=round(fuel_c, 2),
                maintenance_cost=round(maint_c, 2),
                other_cost=round(other_c, 2),
                revenue=round(revenue, 2),
                net_profit=round(net_profit, 2),
                roi_pct=round(roi_pct, 1),
            )
        )

    result.sort(key=lambda x: x.roi_pct, reverse=True)
    return result


@router.get("/leaderboard", response_model=List[DriverLeaderboardItem])
def get_leaderboard(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> List[DriverLeaderboardItem]:
    drivers = session.exec(select(Driver)).all()
    items = []

    for d in drivers:
        avg_eco, score, tier = _calculate_driver_eco_score(d, session)
        items.append((d, avg_eco, score, tier))

    # Sort by score descending
    items.sort(key=lambda x: x[2], reverse=True)

    result = []
    for rank, (d, avg_eco, score, tier) in enumerate(items, 1):
        result.append(
            DriverLeaderboardItem(
                rank=rank,
                driver_id=d.id,
                name=d.name,
                total_km_run=d.total_km_run,
                average_eco_ratio=round(avg_eco, 2),
                score=round(score, 1),
                reward_tier=tier,
            )
        )

    return result


@router.get("/export/csv")
def export_analytics_csv(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Registration Number", "Model", "Type", "Acquisition Cost",
        "Fuel Cost", "Maintenance Cost", "Other Expenses",
        "Total Revenue", "Net Profit", "ROI %"
    ])

    vehicles = session.exec(select(Vehicle)).all()
    completed_trips = session.exec(select(Trip).where(Trip.status == TripStatus.COMPLETED)).all()

    for v in vehicles:
        v_trips = [t for t in completed_trips if t.vehicle_id == v.id]
        revenue = sum(_compute_trip_revenue(t) for t in v_trips)
        fuel_c, maint_c, other_c = _compute_vehicle_costs(v.id, session)
        net_profit = revenue - (fuel_c + maint_c + other_c)
        roi_pct = (net_profit / v.acquisition_cost * 100.0) if v.acquisition_cost > 0 else 0.0

        writer.writerow([
            v.registration_number, v.model, v.type, f"{v.acquisition_cost:.2f}",
            f"{fuel_c:.2f}", f"{maint_c:.2f}", f"{other_c:.2f}",
            f"{revenue:.2f}", f"{net_profit:.2f}", f"{roi_pct:.1f}%"
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transitops_fleet_roi.csv"}
    )


@router.post("/chat", response_model=ChatResponse)
def conversational_search(
    payload: ChatRequest,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
) -> ChatResponse:
    query = payload.query.lower().strip()

    # Keyword 1: Risk / breakdown
    if "risk" in query or "breakdown" in query or "health" in query:
        vehicles = session.exec(
            select(Vehicle)
            .where(Vehicle.breakdown_risk_score >= 40.0)
            .order_by(Vehicle.breakdown_risk_score.desc())
        ).all()
        
        if not vehicles:
            return ChatResponse(
                answer="No vehicles currently have high or medium breakdown risk scores (score >= 40%). Excellent health status!",
                data=[]
            )
            
        data = [
            {
                "Registration": v.registration_number,
                "Model": v.model,
                "Type": v.type,
                "Risk Score": f"{v.breakdown_risk_score:.0f}%",
                "Status": v.status.value
            }
            for v in vehicles
        ]
        return ChatResponse(
            answer=f"Found {len(vehicles)} vehicles with a breakdown risk score of 40% or higher. Here is the list:",
            data=data,
            columns=["Registration", "Model", "Type", "Risk Score", "Status"]
        )

    # Keyword 2: License / expired
    if "license" in query or "expiry" in query or "expire" in query:
        today = date.today()
        warning_date = today + timedelta(days=30)
        drivers = session.exec(select(Driver)).all()

        expired = []
        expiring_soon = []

        for d in drivers:
            if d.license_expiry < today:
                expired.append(d)
            elif d.license_expiry <= warning_date:
                expiring_soon.append(d)

        data = []
        for d in expired:
            data.append({
                "Driver Name": d.name,
                "License No": d.license_number,
                "Expiry Date": str(d.license_expiry),
                "Status": "EXPIRED 🔴"
            })
        for d in expiring_soon:
            data.append({
                "Driver Name": d.name,
                "License No": d.license_number,
                "Expiry Date": str(d.license_expiry),
                "Status": "Expiring Soon 🟡"
            })

        if not data:
            return ChatResponse(
                answer="All drivers have valid licenses with no expirations within the next 30 days.",
                data=[]
            )

        return ChatResponse(
            answer="Here is the compliance report for driver licenses (Expired or Expiring within 30 days):",
            data=data,
            columns=["Driver Name", "License No", "Expiry Date", "Status"]
        )

    # Keyword 3: Cost / operational / expenses
    if "cost" in query or "expense" in query or "spend" in query:
        maint_cost = sum(session.exec(select(MaintenanceLog.total_cost)).all())
        fuel_cost = sum(session.exec(select(FuelLog.cost)).all())
        other_cost = sum(session.exec(select(Expense.amount)).all())
        total_cost = maint_cost + fuel_cost + other_cost

        data = [
            {"Cost Category": "Fuel Purchases ⛽", "Amount": f"₹{fuel_cost:,.2f}"},
            {"Cost Category": "Maintenance & Repairs 🔧", "Amount": f"₹{maint_cost:,.2f}"},
            {"Cost Category": "Tolls & Other Expenses 🛣️", "Amount": f"₹{other_cost:,.2f}"},
            {"Cost Category": "Total Operational Cost 💰", "Amount": f"₹{total_cost:,.2f}"}
        ]

        return ChatResponse(
            answer=f"The total fleet operational cost is **₹{total_cost:,.2f}**. Here is the breakdown:",
            data=data,
            columns=["Cost Category", "Amount"]
        )

    # Keyword 4: Leaderboard / top drivers / eco
    if "leaderboard" in query or "best driver" in query or "eco" in query or "top driver" in query:
        drivers = session.exec(select(Driver)).all()
        driver_scores = []
        for d in drivers:
            avg_eco, score, tier = _calculate_driver_eco_score(d, session)
            driver_scores.append((d, avg_eco, score, tier))
        
        driver_scores.sort(key=lambda x: x[2], reverse=True)
        top_5 = driver_scores[:5]

        data = [
            {
                "Rank": i,
                "Driver Name": d.name,
                "Total KM": f"{d.total_km_run:,.0f} km",
                "Avg Eco-Ratio": f"{avg_eco:.2f}",
                "Leaderboard Score": f"{score:.1f}",
                "Reward Tier": tier
            }
            for i, (d, avg_eco, score, tier) in enumerate(top_5, 1)
        ]

        return ChatResponse(
            answer="Here are the top 5 drivers ranked by their Eco-Efficiency Leaderboard scores:",
            data=data,
            columns=["Rank", "Driver Name", "Total KM", "Avg Eco-Ratio", "Leaderboard Score", "Reward Tier"]
        )

    # Keyword 5: Utilization / active / trip status
    if "utilization" in query or "active" in query or "on trip" in query or "status" in query:
        vehicles = session.exec(select(Vehicle)).all()
        total_v = len(vehicles)
        on_trip = sum(1 for v in vehicles if v.status == VehicleStatus.ON_TRIP)
        available = sum(1 for v in vehicles if v.status == VehicleStatus.AVAILABLE)
        in_shop = sum(1 for v in vehicles if v.status == VehicleStatus.IN_SHOP)
        retired = sum(1 for v in vehicles if v.status == VehicleStatus.RETIRED)

        util_pct = (on_trip / total_v * 100.0) if total_v > 0 else 0.0

        data = [
            {"Metric": "Active Vehicles (On Trip)", "Count": on_trip},
            {"Metric": "Available Vehicles", "Count": available},
            {"Metric": "Vehicles In Shop", "Count": in_shop},
            {"Metric": "Retired Vehicles", "Count": retired},
            {"Metric": "Total Fleet Size", "Count": total_v},
            {"Metric": "Fleet Utilization Percentage", "Count": f"{util_pct:.1f}%"}
        ]

        return ChatResponse(
            answer=f"The current fleet utilization is **{util_pct:.1f}%** with **{on_trip}** vehicles active on trips out of **{total_v}** total vehicles:",
            data=data,
            columns=["Metric", "Count"]
        )

    # Default fallback response
    vehicles = session.exec(select(Vehicle)).all()
    drivers = session.exec(select(Driver)).all()
    completed_trips = session.exec(select(Trip).where(Trip.status == TripStatus.COMPLETED)).all()

    summary_text = (
        f"Hi! I am the TransitOps Conversational Analytics assistant. I can run live reports on your SQLite database.\n\n"
        f"**Quick Fleet Summary:**\n"
        f"- Total registered vehicles: **{len(vehicles)}**\n"
        f"- Total registered drivers: **{len(drivers)}**\n"
        f"- Completed delivery trips: **{len(completed_trips)}**\n\n"
        f"Ask me questions like:\n"
        f"1. *'Show me high risk vehicles'* (Breakdown risk score analysis)\n"
        f"2. *'Are there any expired licenses?'* (Driver compliance checking)\n"
        f"3. *'What are our total costs?'* (Cost and expense breakdown)\n"
        f"4. *'Who is on the leaderboard?'* (Eco-efficiency driver ranking)\n"
        f"5. *'What is our current fleet utilization?'* (Live utilization KPIs)"
    )
    return ChatResponse(answer=summary_text)
