"""update_maintenance_logs_schema

Revision ID: e90544255838
Revises: eca3294b5c18
Create Date: 2026-07-12 13:56:18.640402

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e90544255838'
down_revision: Union[str, Sequence[str], None] = 'eca3294b5c18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add new columns, rename enum type with new values, drop old columns."""

    # 1. Add new columns (nullable first to avoid constraint errors on existing rows)
    op.add_column('maintenance_logs', sa.Column('estimated_cost', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('maintenance_logs', sa.Column('actual_cost', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('maintenance_logs', sa.Column('scheduled_date', sa.Date(), nullable=True))
    op.add_column('maintenance_logs', sa.Column('completion_date', sa.Date(), nullable=True))
    op.add_column('maintenance_logs', sa.Column('remarks', sa.String(length=500), nullable=True))

    # 2. Backfill new columns from existing data so NOT NULL constraint can be applied
    op.execute("UPDATE maintenance_logs SET estimated_cost = cost WHERE estimated_cost IS NULL")
    op.execute("UPDATE maintenance_logs SET scheduled_date = start_date WHERE scheduled_date IS NULL")

    # 3. Now apply NOT NULL constraints on required columns
    op.alter_column('maintenance_logs', 'estimated_cost', nullable=False)
    op.alter_column('maintenance_logs', 'scheduled_date', nullable=False)

    # 4. Rename the old enum type temporarily, create new one with all 4 values
    op.execute("ALTER TYPE maintenance_status_enum RENAME TO maintenance_status_enum_old")
    op.execute("CREATE TYPE maintenance_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')")

    # 5. Migrate existing enum values: OPEN -> PENDING, CLOSED -> COMPLETED
    op.execute("""
        ALTER TABLE maintenance_logs
        ALTER COLUMN status DROP DEFAULT
    """)
    op.execute("""
        ALTER TABLE maintenance_logs
        ALTER COLUMN status TYPE maintenance_status_enum
        USING CASE
            WHEN status::text = 'OPEN'   THEN 'PENDING'::maintenance_status_enum
            WHEN status::text = 'CLOSED' THEN 'COMPLETED'::maintenance_status_enum
            ELSE 'PENDING'::maintenance_status_enum
        END
    """)
    op.execute("""
        ALTER TABLE maintenance_logs
        ALTER COLUMN status SET DEFAULT 'PENDING'
    """)

    # 6. Drop the old enum type
    op.execute("DROP TYPE maintenance_status_enum_old")

    # 7. Drop columns that are no longer needed
    op.drop_column('maintenance_logs', 'performed_by')
    op.drop_column('maintenance_logs', 'end_date')
    op.drop_column('maintenance_logs', 'cost')
    op.drop_column('maintenance_logs', 'start_date')


def downgrade() -> None:
    """Downgrade schema: restore old columns and enum values."""

    # 1. Re-add old columns
    op.add_column('maintenance_logs', sa.Column('start_date', sa.DATE(), nullable=True))
    op.add_column('maintenance_logs', sa.Column('cost', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('maintenance_logs', sa.Column('end_date', sa.DATE(), nullable=True))
    op.add_column('maintenance_logs', sa.Column('performed_by', sa.VARCHAR(length=100), nullable=True))

    # 2. Backfill old columns
    op.execute("UPDATE maintenance_logs SET cost = estimated_cost, start_date = scheduled_date, performed_by = 'migrated'")
    op.alter_column('maintenance_logs', 'start_date', nullable=False)
    op.alter_column('maintenance_logs', 'cost', nullable=False)
    op.alter_column('maintenance_logs', 'performed_by', nullable=False)

    # 3. Recreate old enum type
    op.execute("ALTER TYPE maintenance_status_enum RENAME TO maintenance_status_enum_new")
    op.execute("CREATE TYPE maintenance_status_enum AS ENUM ('OPEN', 'CLOSED')")

    # 4. Migrate enum values back
    op.execute("""
        ALTER TABLE maintenance_logs
        ALTER COLUMN status DROP DEFAULT
    """)
    op.execute("""
        ALTER TABLE maintenance_logs
        ALTER COLUMN status TYPE maintenance_status_enum
        USING CASE
            WHEN status::text IN ('PENDING', 'IN_PROGRESS') THEN 'OPEN'::maintenance_status_enum
            ELSE 'CLOSED'::maintenance_status_enum
        END
    """)
    op.execute("""
        ALTER TABLE maintenance_logs
        ALTER COLUMN status SET DEFAULT 'OPEN'
    """)
    op.execute("DROP TYPE maintenance_status_enum_new")

    # 5. Drop new columns
    op.drop_column('maintenance_logs', 'remarks')
    op.drop_column('maintenance_logs', 'completion_date')
    op.drop_column('maintenance_logs', 'scheduled_date')
    op.drop_column('maintenance_logs', 'actual_cost')
    op.drop_column('maintenance_logs', 'estimated_cost')
