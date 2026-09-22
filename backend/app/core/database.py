import enum

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sync_schema() -> None:
    """
    Adds any model columns that are missing from already-existing tables.
    `Base.metadata.create_all` only creates brand-new tables, so a column added to a
    model after its table already exists needs this to reach the database too. This
    project has no Alembic migrations set up, so this keeps local/dev schemas in sync
    without a manual ALTER TABLE every time a model gains a field.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                ddl_type = column.type.compile(dialect=engine.dialect)

                # Include a DEFAULT so existing rows are backfilled instead of left NULL --
                # important for columns whose Python side isn't declared nullable (e.g. enums).
                default_clause = ""
                if column.default is not None and getattr(column.default, "is_scalar", False):
                    default_value = column.default.arg
                    if isinstance(default_value, enum.Enum):
                        default_value = default_value.value
                    if isinstance(default_value, bool):
                        default_clause = f" DEFAULT {1 if default_value else 0}"
                    elif isinstance(default_value, (int, float)):
                        default_clause = f" DEFAULT {default_value}"
                    elif isinstance(default_value, str):
                        escaped = default_value.replace("'", "''")
                        default_clause = f" DEFAULT '{escaped}'"

                conn.execute(
                    text(f"ALTER TABLE `{table.name}` ADD COLUMN `{column.name}` {ddl_type}{default_clause}")
                )
