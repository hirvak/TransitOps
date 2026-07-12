from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.Database.database import Base
from app.Utils.config import settings

# Import all models here
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle, VehicleDocument
from app.Drivers.models import Driver
from app.Trips.models import Trip
from app.Maintenance.models import MaintenanceLog
from app.FuelExpense.models import FuelLog, Expense
from app.Notifications.models import Notification

config = context.config

# Read database URL from .env
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in offline mode."""
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in online mode."""

    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()