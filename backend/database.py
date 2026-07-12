from sqlmodel import SQLModel, Session, create_engine
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


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and auto-closes it."""
    with Session(engine) as session:
        yield session
