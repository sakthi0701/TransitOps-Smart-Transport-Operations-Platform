"""
TransitOps FastAPI application entry point.
All routes are mounted under /api/v1.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import create_db_and_tables

# Import all model modules so SQLModel.metadata has every table registered
import backend.models  # noqa: F401

from backend.routers import auth, vehicles, drivers, trips, maintenance, fuel, expenses


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Creates DB tables on startup (idempotent — safe to run repeatedly)."""
    create_db_and_tables()
    yield


app = FastAPI(
    title="TransitOps API",
    description="Smart Transport Operations Platform — Hackathon Edition",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX)
app.include_router(vehicles.router, prefix=PREFIX)
app.include_router(drivers.router, prefix=PREFIX)
app.include_router(trips.router, prefix=PREFIX)
app.include_router(maintenance.router, prefix=PREFIX)
app.include_router(fuel.router, prefix=PREFIX)
app.include_router(expenses.router, prefix=PREFIX)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "TransitOps API", "version": "1.0.0"}
