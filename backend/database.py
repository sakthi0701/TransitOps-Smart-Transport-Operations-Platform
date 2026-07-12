from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import text
from typing import Generator
import os

# Use SQLite locally; override via DATABASE_URL env var for any deployment
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./transitops.db")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI threading
)


def create_db_and_tables() -> None:
    """Creates all tables defined by SQLModel models. Called at app startup."""
    SQLModel.metadata.create_all(engine)
    # Safe migration: add charge_amount column to trips if it doesn't exist yet
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE trips ADD COLUMN charge_amount REAL DEFAULT 0.0"))
            conn.commit()
        except Exception:
            pass  # Column already exists — that's fine


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and auto-closes it."""
    with Session(engine) as session:
        yield session
