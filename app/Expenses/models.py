import uuid
from enum import Enum
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Vehicles.models import Vehicle


class ExpenseType(str, Enum):
    FUEL = "FUEL"
    MAINTENANCE = "MAINTENANCE"
    TOLL = "TOLL"
    INSURANCE = "INSURANCE"
    PERMIT = "PERMIT"
    MISC = "MISC"


class Expense(BaseModel):
    __tablename__ = "expenses"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expense_type: Mapped[ExpenseType] = mapped_column(
        SQLEnum(ExpenseType, name="expense_type_enum"),
        nullable=False
    )
    receipt_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="expenses",
        lazy="selectin"
    )
