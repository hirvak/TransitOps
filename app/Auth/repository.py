import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.Auth.models import Role


class AuthRepository:
    @staticmethod
    def get_role_by_id(db: Session, role_id: uuid.UUID) -> Role | None:
        """
        Fetch role by primary key ID.
        """
        stmt = select(Role).where(Role.id == role_id, Role.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def get_role_by_name(db: Session, name: str) -> Role | None:
        """
        Fetch role by name.
        """
        stmt = select(Role).where(Role.name == name, Role.is_deleted == False)
        return db.scalar(stmt)
