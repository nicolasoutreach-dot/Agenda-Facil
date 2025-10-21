from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context
import os, sys

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

sys.path.insert(0, os.path.abspath(os.path.join(os.getcwd())))

from app.db.base import Base  # noqa
from app.models.user import User  # noqa
from app.models.provider import Establishment, Provider, ProviderWorkHours  # noqa
from app.models.appointment import Appointment  # noqa
from app.core.config import settings

target_metadata = Base.metadata

def run_migrations_offline():
    url = settings.database_url
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = create_engine(settings.database_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
