# TransitOps — Smart Transport Operations Platform
---

## 1. Product Overview
 
TransitOps replaces spreadsheets and logbooks with one platform to manage a transport fleet: vehicles, drivers, trips, maintenance, fuel/expenses, and analytics — with automatic status rules and a few "wow factor" intelligent features layered on top.
 
**Target Users:** Fleet Manager, Driver, Safety Officer, Financial Analyst.
 
**Execution Principle:** No static JSON. Everything lives in a real local database, so the demo feels like a real product, not a mockup.
 
---
 
## 2. Tech Stack
 
| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS + lucide-react icons | Fast to build, responsive by default |
| Backend | Python FastAPI | Fast to write, clean routing, easy AI/logic integration |
| Database | SQLite via SQLAlchemy/SQLModel | Local, offline-capable, fully relational |
| Validation | Pydantic (backend), Zod (frontend) | Robust input validation on both ends |
| Auth | JWT | Simple, standard, RBAC-friendly |
 
---
 
## 3. Database Schema
 
**Users**
`id, email, password_hash, role (Manager | Dispatcher | Safety | Finance)`
 
**Vehicles**
`id, registration_number (unique), model, type, max_capacity_kg, odometer_km, acquisition_cost, status (Available | On Trip | In Shop | Retired), optimal_mileage_kmpl, breakdown_risk_score (0-100)`
 
**Drivers**
`id, name, license_number, license_expiry, status (Available | On Trip | Off Duty | Suspended), safety_score (0-100), inclination_factor (0-100), total_km_run, experience_level (1-10; <3 = Beginner, >7 = Expert)`
 
**Trips**
`id, source, destination, primary_driver_id, secondary_driver_id (optional), vehicle_id, cargo_weight_kg, planned_distance_km, actual_distance_km, fuel_consumed_liters, status (Draft | Dispatched | Completed | Cancelled), is_safety_checklist_complete (bool), checkpoints_cleared (int)`
 
**MaintenanceLogs**
`id, vehicle_id, type, cost, components_replaced (text), total_cost, date_logged, status (Open | Closed)`
 
**FuelLogs**
`id, vehicle_id, trip_id, liters, cost, date`
 
**Expenses**
`id, vehicle_id, type (toll/other), amount, date`
 
**Alerts**
`id, trip_id, message, status (Unread | Read), timestamp`
 
**PrePostTripLogs**
`id, trip_id, type (Pre | Post), notes, damage_reported (bool), logged_by_user_id, timestamp`
 
---
 
## 4. Core Functional Requirements
 
### 4.1 Authentication
- Email/password login, JWT-based.
- RBAC: routes and UI elements restricted by role.
### 4.2 Dashboard
- KPIs: Active Vehicles, Available Vehicles, In Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %.
- Filters: vehicle type, status, region.
- All data pulled live from the database — no hardcoded numbers.
### 4.3 Vehicle Registry (CRUD)
- Unique registration number enforced.
- Statuses: Available, On Trip, In Shop, Retired.
### 4.4 Driver Management (CRUD)
- Flags drivers automatically if `license_expiry < today`.
- Statuses: Available, On Trip, Off Duty, Suspended.
### 4.5 Trip Management
- Create trip → pick source, destination, vehicle, driver(s), cargo weight, planned distance.
- Lifecycle: **Draft → Dispatched → Completed → Cancelled**.
- Pre-trip safety checklist (checkboxes: tires, brakes, lights, etc.) must be completed before a trip can move to Dispatched.
### 4.6 Maintenance
- Opening a maintenance record → vehicle status auto-switches to In Shop (removed from dispatch pool).
- Closing it → vehicle returns to Available (unless Retired).
- Breakdown repairs log `components_replaced` and `total_cost`.
### 4.7 Fuel & Expense Tracking
- Log fuel (liters, cost, date) and expenses (tolls, etc.).
- Auto-computed: Total Operational Cost = Fuel + Maintenance, per vehicle.
### 4.8 Reports & Analytics
- Fuel Efficiency (Distance/Fuel), Fleet Utilization, Operational Cost.
- Vehicle ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost.
- CSV export (required), PDF export (optional).
---
 
## 5. Mandatory Business Rules
 
1. Vehicle registration number must be unique.
2. Retired or In Shop vehicles never appear in dispatch selection.
3. Drivers with expired licenses or Suspended status cannot be assigned.
4. A driver/vehicle already On Trip cannot be assigned elsewhere.
5. Cargo weight must not exceed vehicle's max load capacity.
6. Trip cannot move to Dispatched until safety checklist is complete.
7. Dispatch → vehicle + driver(s) status become On Trip.
8. Complete → vehicle + driver(s) status return to Available; updates `odometer_km` and `total_km_run`.
9. Cancel (from Dispatched) → vehicle + driver(s) restored to Available.
10. Opening maintenance → vehicle becomes In Shop.
11. Closing maintenance → vehicle becomes Available (unless Retired).
12. Trips over 500 km **must** have two drivers: one Expert (experience_level ≥ 7) and one Beginner (≤ 3), mentor-paired.
---
 
## 6. "Wow Factor" Feature Modules
 
### 6.1 Agentic Dispatcher ("Magic Assign")
On a Draft trip, clicking **Auto-Assign** runs:
1. **Filter:** Only Available drivers/vehicles; vehicle capacity ≥ cargo weight.
2. **Driver Score:** `(Inclination Factor × 0.4) + (Safety Score × 0.6)`
3. **Vehicle Score (Capacity Efficiency):** `(cargo_weight / max_capacity) × 100` — closer to 100 without exceeding it is best (avoids wasting a big truck on a small load).
4. **Mentor Pairing Rule:** If `planned_distance_km > 500`, must assign one Expert (≥7) + one Beginner (≤3) driver, both meeting availability rules.
5. **Output:** Assign top-scoring pair; return a short plain-English reasoning log (e.g., "Assigned Van-05 (optimal capacity match) and Alex + Priya (mentor pair for long-haul trip)").
### 6.2 Eco-Efficiency Leaderboard
- On trip completion: `Actual Mileage = actual_distance_km / fuel_consumed_liters`
- `Eco-Ratio = Actual Mileage / vehicle.optimal_mileage_kmpl`
- **Driver Score** (drives the leaderboard ranking) = `(total_km_run × 0.7) + (Eco-Ratio × 100 × 0.3)`
  - Total km run is the dominant factor by design, per requirement.
- Top 5 leaderboard shows: Total KM, Average Eco-Ratio, Reward Tier badge (e.g., Bronze/Silver/Gold based on score thresholds), and a crown/badge for #1.
### 6.3 Predictive Maintenance Intelligence
- Runs automatically on trip completion.
- Risk score rises with: distance since last maintenance, frequency of >90%-capacity loads, and total odometer.
- Vehicle Registry shows a color-coded Risk indicator (Green/Yellow/Red). Red triggers a dashboard alert.
### 6.4 Conversational Analytics
- Single `POST /api/chat` endpoint.
- **Fallback (safe default for the 8-hour window):** keyword parser mapping phrases like "high cost" or "expiring licenses" to predefined SQL queries.
- **Stretch:** if time allows, use an LLM to turn the question into a safe, read-only SQL query against the schema.
### 6.5 Simulated Live Tracking
- No native GPS/mobile app (too costly for 8 hours).
- Instead: a **Driver View** web page with a "Reached Checkpoint" button.
- Each click increments `checkpoints_cleared` and recalculates ETA mathematically from remaining distance and an assumed average speed/rest time — gives the live-tracking feel without needing real GPS.
### 6.6 Pre/Post-Trip Vehicle Logs
- Safety Officer or Fleet Manager fills a short log before and after each trip (condition notes, damage flag).
- A damage flag automatically opens a maintenance review ticket.
### 6.7 One-Way Dispatch Alerts (Chat replacement)
- No live two-way chat (too risky to build reliably in time).
- Fleet Manager sends a short priority text tied to a `trip_id` via `POST /api/alerts`.
- Driver View polls/fetches and shows it as a banner alert — asynchronous, no WebSockets needed.
---
 
## 7. UI Structure (Based on Mockup)
 
The mockup (Excalidraw wireframe) defines 9 screens that share one consistent shell. The coding agent should build a single layout component and reuse it everywhere, rather than styling each page separately.
 
**Shared shell (every screen except Auth):**
- **Top bar:** app name/logo on the left ("TransitOps"), a page title, and a profile/settings icon on the right.
- **Left sidebar** (fixed, dark background): navigation items in this order — Dashboard, Fleet (Vehicle Registry), Drivers, Dispatch, Maintenance, Fuel & Expense, Reports & Analytics, Settings. Active item is highlighted.
- **Main content area:** everything else changes per screen.
- **Theme:** dark background throughout, with colored pill/badge components for status (green = Available/Closed/Good, blue = On Trip/In Progress, orange = In Shop/Pending/Warning, red = Suspended/Retired/Risk/Alert).
**Screen-by-screen:**
 
1. **Authentication** — standalone screen, no sidebar. Left panel: logo, tagline, and a short "who this is for" list (Fleet Manager, Dispatcher, Safety Officer, Finance). Right panel: simple email + password login form with a role dropdown and a prominent "Sign In" button.
2. **Dashboard** — row of KPI cards along the top (Active Vehicles, Available, In Maintenance, Active Trips, Drivers On Duty, Fleet Utilization %). Below that: a two-column layout — a vehicle/driver status table on the left with colored status badges, and a small "Fleet Utilization" bar/progress chart on the right.
3. **Vehicle Registry** — full-width data table: Registration No., Model, Type, Capacity, Odometer, Status (colored badge). "Add Vehicle" button top-right. A red inline warning row style is available for flagging issues (e.g., duplicate registration).
4. **Drivers & Safety Profiles** — data table: Name, License No., License Expiry, Safety Score, Status, and a Risk/Compliance badge (color-coded — green = compliant, red = expired/suspended). "Add Driver" button top-right. Inline red banner for expiring/expired license warnings.
5. **Trip Dispatch** — the busiest screen, split into a form/detail panel and a status panel:
   - Trip creation fields (source, destination, cargo weight, distance).
   - Driver & vehicle selection area showing eligible options as selectable chips/badges.
   - A highlighted **"Auto-Assign"** button (this is the Agentic Dispatcher trigger).
   - A reasoning/result panel showing the assignment output and any validation warnings (e.g., red banner for "cargo exceeds capacity" or "long trip needs mentor pair").
   - Action buttons at the bottom: Dispatch / Cancel.
6. **Maintenance** — table of maintenance records (Vehicle, Type, Cost, Status badge). "Add Record" button. A progress/slider-style element to represent repair progress or risk level, plus a small warning strip below for vehicles flagged high-risk.
7. **Fuel & Expense Management** — table of logs (Vehicle, Fuel/Expense type, Amount, Date, Status). Two action buttons top-right ("Log Fuel", "Log Expense"). A small "cost breakdown" summary panel and a mini bar chart at the bottom for trend visibility.
8. **Reports & Analytics** — top row of summary metric cards (e.g., total distance, utilization %, revenue, ROI %). Below: a bar chart (fuel efficiency or cost trend) on the left and a horizontal progress/ranking bar (this is a good spot for the Eco-Leaderboard) on the right.
9. **Settings & RBAC** — simple list/table of users with editable Role and Permission columns, and a "Manage Roles" button. Minimal by design — this screen only needs to exist, not impress.
**Build note for the agent:** Match the *structure* (sidebar position, badge colors, card-then-table pattern, top-right primary action buttons) rather than pixel-matching the wireframe — it's a low-fidelity mockup meant to convey layout and hierarchy, not final visual design.
 
---
 
## 8. UI/UX Guidelines
- Persistent left sidebar: Dashboard, Dispatch, Fleet, Drivers, Maintenance, Analytics, Driver View.
- Clean, consistent color scheme; dark mode toggle.
- Toast notifications for every success/error (e.g., "Trip dispatched successfully," "Error: cargo exceeds capacity").
- Robust inline form validation (no silent failures).
---
 
## 9. Version Control Strategy
- Initialize the Git repo before writing any code.
- Branch per feature: `feature/auth`, `feature/dispatcher-logic`, `feature/ui-components`, `feature/leaderboard`, etc.
- Every team member commits under their own name — no single-person repo management.
- Small, frequent commits so merge conflicts stay small under time pressure.
---
 
## 10. Build Phases (8-Hour Plan)
 
**Phase 1 — Foundation (Hr 0.0–1.5)**
- Backend: FastAPI scaffold, DB models (Section 3), CRUD for Vehicles + Drivers.
- Frontend: Routing, sidebar/navbar layout, auth screens (mock login to keep moving).
- ✅ Milestone: Frontend displays live vehicle/driver lists from a real DB.
**Phase 2 — Core Operations (Hr 1.5–3.5)**
- Backend: Trip endpoints (create/update/status) with all validations (weight, availability, license).
- Frontend: Create Trip form, Vehicle/Driver tables, pre-trip safety checklist modal.
- ✅ Milestone: A trip can be created, validated, and dispatched end-to-end.
**Phase 3 — Wow Logic (Hr 3.5–5.5)**
- Backend: Agentic Dispatcher (scoring + mentor pairing + reasoning log), Alerts endpoint.
- Frontend: Driver View (active trip, checkpoint button, alerts banner), Fleet Manager alert sender.
- ✅ Milestone: Auto-Assign correctly pairs driver/vehicle, including mentor pairing on long trips.
**Phase 4 — Analytics & Leaderboard (Hr 5.5–7.0)**
- Backend: Eco-Ratio calc on completion, Leaderboard endpoint, Risk Score calc, (stretch) NLP search.
- Frontend: Dashboard KPI cards on live data, Eco-Leaderboard UI, Risk indicator colors.
- ✅ Milestone: Dashboard and leaderboard both reflect real, live data.
**Phase 5 — Polish & Demo Prep (Hr 7.0–8.0)**
- No new features past this point.
- Seed realistic data (real-sounding names, varied statuses, believable numbers).
- Fix UI bugs, confirm dark mode doesn't break tables, confirm toasts look clean.
- Script the demo: show a manual trip first, then hit **Auto-Assign** to show the "magic," then show the Leaderboard and Risk alerts.
---
 
## 11. Deliverables Checklist
- [ ] Responsive web app, all core CRUD working
- [ ] Auth + RBAC
- [ ] Trip lifecycle with all business rules enforced
- [ ] Maintenance workflow (auto status change)
- [ ] Fuel & expense tracking with auto cost totals
- [ ] Dashboard with live KPIs
- [ ] Agentic Dispatcher (with mentor pairing)
- [ ] Eco-Efficiency Leaderboard
- [ ] Predictive Maintenance risk indicator
- [ ] Driver View with simulated checkpoints + one-way alerts
- [ ] Pre-trip safety checklist gating dispatch
- [ ] Pre/post-trip logs
- [ ] Dark mode, CSV export
- [ ] Git repo with multiple contributors and feature branches
 