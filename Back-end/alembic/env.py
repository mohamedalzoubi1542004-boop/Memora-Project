"""Alembic environment — wires SQLAlchemy metadata to the migration engine."""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Import the shared Base so Alembic can detect schema changes automatically
# ---------------------------------------------------------------------------
from app.database import Base  # noqa: F401 — registers all models via imports below

# Import every model module here so their tables appear in Base.metadata
import app.models.user           # noqa: F401
import app.models.doctor         # noqa: F401
import app.models.patient        # noqa: F401
import app.models.admin          # noqa: F401
import app.models.appointment    # noqa: F401
import app.models.message        # noqa: F401
import app.models.diagnosis      # noqa: F401
import app.models.mmse_result    # noqa: F401
import app.models.symptom_entry  # noqa: F401
import app.models.game_session   # noqa: F401
import app.models.family_contact # noqa: F401
import app.models.caregiver_assessment  # noqa: F401
import app.models.daily_checkin  # noqa: F401

# ---------------------------------------------------------------------------
# Alembic Config object gives access to values in alembic.ini
# ---------------------------------------------------------------------------
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the URL from .env so it stays in one place
from app.config import settings  # noqa: E402
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
