"""merge heads

Revision ID: f909d1939d4d
Revises: 931efb4100b5, e90544255838
Create Date: 2026-07-12 14:47:11.861294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f909d1939d4d'
down_revision: Union[str, Sequence[str], None] = ('931efb4100b5', 'e90544255838')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
