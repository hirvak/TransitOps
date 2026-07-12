"""update_fuel_and_expense_tables

Revision ID: 931efb4100b5
Revises: bad3ecef7f09
Create Date: 2026-07-12 14:15:01.285985

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '931efb4100b5'
down_revision: Union[str, Sequence[str], None] = 'bad3ecef7f09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop existing tables and their enums
    op.execute("DROP TABLE IF EXISTS fuel_logs CASCADE;")
    op.execute("DROP TABLE IF EXISTS expenses CASCADE;")
    op.execute("DROP TYPE IF EXISTS fuel_type_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS expense_type_enum CASCADE;")

    # Recreate enums
    fuel_type_enum = sa.Enum('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', name='fuel_type_enum')
    expense_type_enum = sa.Enum('TOLL', 'PARKING', 'REPAIR', 'INSURANCE', 'FINE', 'MAINTENANCE', 'OTHER', name='expense_type_enum')

    # Recreate expenses table
    op.create_table(
        'expenses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('vehicle_id', sa.UUID(), nullable=False),
        sa.Column('trip_id', sa.UUID(), nullable=True),
        sa.Column('expense_type', expense_type_enum, nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('expense_date', sa.Date(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('created_by_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expenses_vehicle_id'), 'expenses', ['vehicle_id'], unique=False)
    op.create_index(op.f('ix_expenses_trip_id'), 'expenses', ['trip_id'], unique=False)
    op.create_index(op.f('ix_expenses_created_by_id'), 'expenses', ['created_by_id'], unique=False)

    # Recreate fuel_logs table
    op.create_table(
        'fuel_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('vehicle_id', sa.UUID(), nullable=False),
        sa.Column('trip_id', sa.UUID(), nullable=False),
        sa.Column('fuel_type', fuel_type_enum, nullable=False),
        sa.Column('station_name', sa.String(length=100), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('fuel_quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('price_per_liter', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total_cost', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('odometer_reading', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('fuel_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_by_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fuel_logs_vehicle_id'), 'fuel_logs', ['vehicle_id'], unique=False)
    op.create_index(op.f('ix_fuel_logs_trip_id'), 'fuel_logs', ['trip_id'], unique=False)
    op.create_index(op.f('ix_fuel_logs_created_by_id'), 'fuel_logs', ['created_by_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS fuel_logs CASCADE;")
    op.execute("DROP TABLE IF EXISTS expenses CASCADE;")
    op.execute("DROP TYPE IF EXISTS fuel_type_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS expense_type_enum CASCADE;")
