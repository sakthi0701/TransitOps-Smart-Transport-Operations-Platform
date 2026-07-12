# 🚚 TransitOps

**The Smart Transport Operations Platform**

Welcome to **TransitOps**! Say goodbye to chaotic spreadsheets, lost logbooks, and dispatch headaches. TransitOps is an intelligent, all-in-one platform built to manage transport fleets effortlessly. From tracking vehicles and drivers to scheduling trips, predicitve maintenance, and managing fuel expenses—we've got it covered.

Built with speed and smarts during an 8-hour hackathon, this platform doesn't just record data; it helps you make better decisions with features like an **Agentic Dispatcher**, **Eco-Efficiency Leaderboards**, and **Predictive Maintenance**.

---

## Why TransitOps? (The "Wow" Features)

We didn't just build a CRUD app. We baked intelligence directly into the operations:

- **Agentic Dispatcher ("Magic Assign"):** Don't know who to send? Click "Auto-Assign" on a draft trip. Our algorithm scores available drivers and vehicles based on load capacity, safety scores, and driving experience. It even automatically pairs an Expert with a Beginner for mentor-pairing on long-haul trips (>500km)!
- **Eco-Efficiency Leaderboard:** Gamify good driving! Drivers are ranked based on their total distance run and their Eco-Ratio (actual mileage vs. optimal vehicle mileage). Better driving = higher rank.
- **Predictive Maintenance Risk:** Stop breakdowns before they happen. After every trip, the system recalculates a color-coded risk score for each vehicle based on recent heavy loads, distance since last maintenance, and total odometer readings.
- **Simulated Live Tracking:** A dedicated Driver View lets drivers check in at milestones ("Reached Checkpoint"), updating the ETA dynamically without expensive live GPS hardware.
- **Dispatch Alerts:** Real-time, one-way priority alerts from the Fleet Manager straight to the Driver View.

---

## Tech Stack

We chose a stack that is incredibly fast to build with, yet robust enough to handle real-world operations.

- **Frontend:** React 19 + Vite + Tailwind CSS + Zustand (for state) + Zod (for validation)
- **Backend:** Python FastAPI + SQLModel + SQLite
- **Authentication:** JWT with Role-Based Access Control (RBAC)

*Note: There is no static JSON mocking here! Everything runs on a real local relational database.*

---

## Getting Started

Follow these steps to get TransitOps running locally. You will need to start both the frontend and backend servers.

### 1. Backend Setup

Open a terminal and navigate to the project root:

```bash
# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Run the backend server
python -m uvicorn backend.main:app --reload --port 8000
```
*The backend API will be running at `http://localhost:8000`*
*Interactive API documentation (Swagger) is available at `http://localhost:8000/docs`*

### 2. Frontend Setup

Open a second terminal window, navigate to the frontend folder, and start the app:

```bash
cd frontend
npm install
npm run dev
```
*The frontend application will be running at `http://localhost:5173`*

---

## Demo Credentials

To experience the platform's Role-Based Access Control, you can log in using these demo accounts. Each role has access to specific screens and actions.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Fleet Manager** | `manager@demo.com` | `demo1234` |
| **Dispatcher** | `driver@demo.com` | `demo1234` |
| **Safety Officer** | `safety@demo.com` | `demo1234` |
| **Finance Analyst**| `finance@demo.com` | `demo1234` |

---

## Key Business Rules Enforced

The platform is designed to keep operations safe and compliant:
- **No Double Booking:** A vehicle or driver currently *On Trip* cannot be reassigned.
- **Strict Capacity Limits:** Cargo weight can never exceed a vehicle's maximum capacity.
- **Safety First:** A trip cannot be dispatched until the Pre-Trip Safety Checklist is fully completed.
- **Compliance Guardrails:** Drivers with suspended statuses or expired licenses are automatically hidden from the dispatch pool. Vehicles marked as *In Shop* or *Retired* are completely blocked from use.

---

## Project Structure

```text
transitops/
├── backend/            # Python FastAPI application
│   ├── auth/           # JWT and RBAC logic
│   ├── models/         # Database models (User, Vehicle, Trip, etc.)
│   ├── routers/        # API Endpoints (vehicles, trips, etc.)
│   └── main.py         # App entry point
├── frontend/           # React frontend application
│   └── src/
│       ├── api/        # Axios API clients
│       ├── layouts/    # App shell & sidebar
│       ├── pages/      # Dashboard, Fleet, Dispatch, DriverView, etc.
│       └── store/      # Zustand state management
└── transitops.db       # Local SQLite Database
```

---

*Built during an 8-Hour Hackathon.*
