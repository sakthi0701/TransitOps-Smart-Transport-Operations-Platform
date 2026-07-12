# TransitOps — Quick Context Brief for Coding Agent

## What we're building
A fleet/transport ops web app: vehicles, drivers, trips, maintenance, fuel, analytics — plus an AI-style auto-dispatcher and a driver leaderboard. 8-hour hackathon build.
 
## Stack (fixed — don't deviate)
- Frontend: React (Vite) + Tailwind CSS + lucide-react
- Backend: Python FastAPI
- DB: SQLite via SQLAlchemy/SQLModel (real DB, not static JSON)
- Validation: Pydantic (backend) + Zod (frontend)
- Auth: JWT + RBAC
## Core entities (build models first)
`Users, Vehicles, Drivers, Trips, MaintenanceLogs, FuelLogs, Expenses, Alerts, PrePostTripLogs`
Full field list is in PRD Section 3 — copy it exactly, don't improvise fields.
 
## Non-negotiable business rules
- Registration numbers unique.
- Retired/In Shop vehicles never selectable for dispatch.
- Expired-license or Suspended drivers never assignable.
- No double-booking a driver/vehicle already On Trip.
- Cargo weight ≤ vehicle max capacity.
- Trip can't dispatch until safety checklist is checked off.
- Dispatch/Complete/Cancel all trigger automatic status flips (see PRD Section 5).
- Trips > 500km require an Expert (experience_level ≥7) + Beginner (≤3) driver pair.
## The 4 "smart" features (this is what wins the demo)
1. **Agentic Dispatcher** — "Auto-Assign" button scores available drivers/vehicles and picks the best pair, with mentor-pairing on long trips. Formulas in PRD Section 6.1.
2. **Eco-Leaderboard** — ranks drivers by `(total_km_run × 0.7) + (Eco-Ratio × 100 × 0.3)`. Total km is the bigger factor — don't invert the weights.
3. **Predictive Maintenance Risk** — color-coded risk score per vehicle, recalculated after each completed trip.
4. **Simulated live tracking** — no real GPS. Just a "Reached Checkpoint" button that recalculates ETA.
Two more supporting features: one-way Dispatch Alerts (Fleet Manager → Driver, no live chat) and pre/post-trip damage logs.
 
## UI structure
9 screens, one shared shell: top bar + left sidebar (Dashboard, Fleet, Drivers, Dispatch, Maintenance, Fuel & Expense, Reports, Settings). Dark theme, colored status badges (green/blue/orange/red). Full screen-by-screen breakdown is in PRD Section 7 — read it before building any page.
 
## Build order (don't skip ahead)
1. DB models + basic CRUD (vehicles, drivers)
2. Trip lifecycle + validations
3. Agentic Dispatcher + alerts + driver view
4. Leaderboard + risk score + dashboard KPIs
5. Polish only — no new features in the last hour
## How to prompt the agent
Feed the PRD one section at a time, in the order above. After each section, verify it runs before moving to the next. Comment the Dispatcher and Leaderboard logic clearly — you'll need to explain the formulas to judges.
 