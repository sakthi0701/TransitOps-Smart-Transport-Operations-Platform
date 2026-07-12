# TransitOps — Project Context

**Last Updated:** Phase 1 Complete  
**Status:** 🟢 Both servers running

---

## What We're Building
Smart Fleet Operations Platform: vehicles, drivers, trips, maintenance, fuel, analytics + Agentic Dispatcher + Eco-Leaderboard.

## Running Servers
| Service  | URL                         | Command |
|----------|-----------------------------|---------|
| Backend  | http://localhost:8000       | `.\venv\Scripts\uvicorn backend.main:app --reload --port 8000` |
| Frontend | http://localhost:5173       | `cd frontend && npm run dev` |
| API Docs | http://localhost:8000/docs  | (auto, Swagger UI) |

## Demo Credentials
| Role       | Email                | Password  |
|------------|----------------------|-----------|
| Manager    | manager@demo.com     | demo1234  |
| Dispatcher | driver@demo.com      | demo1234  |
| Safety     | safety@demo.com      | demo1234  |
| Finance    | finance@demo.com     | demo1234  |

---

## Stack
- **Frontend:** React 19 + Vite 8 + Tailwind CSS 3 + lucide-react + Zustand + react-hook-form + Zod + Axios
- **Backend:** Python FastAPI + SQLModel + SQLite (`transitops.db`)
- **Auth:** JWT via python-jose + bcrypt (direct, not passlib — passlib incompatible with bcrypt 4.x)

## Directory Structure
```
transitops/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router mounts
│   ├── database.py          # SQLite engine + get_session dep
│   ├── seed.py              # Demo data seeder
│   ├── auth/jwt.py          # bcrypt password hash + JWT create/verify
│   ├── models/              # 9 SQLModel table models
│   │   ├── user.py          # UserRole enum: Manager|Dispatcher|Safety|Finance
│   │   ├── vehicle.py       # VehicleStatus: Available|On Trip|In Shop|Retired
│   │   ├── driver.py        # DriverStatus + license_expiry tracking
│   │   ├── trip.py          # TripStatus: Draft|Dispatched|Completed|Cancelled
│   │   ├── maintenance_log.py
│   │   ├── fuel_log.py
│   │   ├── expense.py
│   │   ├── alert.py
│   │   └── prepost_trip_log.py
│   └── routers/
│       ├── auth.py          # POST /auth/login, GET /auth/me
│       ├── vehicles.py      # Full CRUD + ?dispatchable=true filter
│       └── drivers.py       # Full CRUD + ?assignable=true filter + license_expired computed
├── frontend/src/
│   ├── main.jsx             # React 19 entry + BrowserRouter + Toaster
│   ├── App.jsx              # Routes + ProtectedRoute wrapper
│   ├── api/client.js        # Axios + JWT auto-attach + 401 auto-logout
│   ├── store/authStore.js   # Zustand auth store (persists to localStorage)
│   ├── layouts/AppLayout.jsx# Collapsible sidebar + outlet
│   └── pages/
│       ├── Login.jsx        # Zod form + demo credentials panel
│       ├── Dashboard.jsx    # Live KPI cards + risk panel
│       ├── Fleet.jsx        # Vehicle CRUD table + modals
│       └── Drivers.jsx      # Driver CRUD table + license expired badge
├── requirements.txt
├── venv/                    # Python 3.13 virtualenv
└── transitops.db            # SQLite database (created by seed)
```

## Key Business Rules (enforced in backend)
1. `registration_number` unique — 409 if duplicate
2. `license_number` unique — 409 if duplicate
3. Retired/In Shop vehicles excluded from `?dispatchable=true`
4. Suspended/expired-license drivers excluded from `?assignable=true`
5. Trip dispatch blocked until `is_safety_checklist_complete = true`
6. Cargo weight ≤ vehicle max capacity
7. No double-booking (driver/vehicle already On Trip)
8. Trips > 500km require Expert (≥7) + Beginner (≤3) driver pair

## Phase Progress
- [x] Phase 1: Foundation (backend + models + auth + Fleet/Driver CRUD + seed)
- [ ] Phase 2: Trip lifecycle + validations + maintenance + fuel
- [ ] Phase 3: Agentic Dispatcher + Driver View + Alerts
- [ ] Phase 4: Analytics + Leaderboard + Risk Score
- [ ] Phase 5: Polish + demo prep

## Known Issues / Notes
- `passlib` is NOT used — direct `bcrypt` calls to avoid Python 3.13 + bcrypt 4.x incompatibility
- Windows console emoji printing requires `$env:PYTHONIOENCODING='utf-8'` prefix for seed script
- Vite scaffold was vanilla TS — we added React + `@vitejs/plugin-react` manually
