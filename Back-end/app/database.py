"""Database engine, session factory, and base model class."""

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# SQLite needs check_same_thread=False; PostgreSQL ignores it via connect_args filter
_IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _IS_SQLITE else {}

engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)


# Per-connection SQLite tuning:
#  - foreign_keys=ON  → enforce ON DELETE CASCADE / SET NULL.
#  - journal_mode=WAL → readers no longer block on a writer (default DELETE mode
#    locks the whole DB on every write); big concurrency win for a web app.
#  - busy_timeout     → a blocked connection waits 5s instead of instantly
#    failing with "database is locked".
if _IS_SQLITE:
    @event.listens_for(Engine, "connect")
    def _configure_sqlite(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
