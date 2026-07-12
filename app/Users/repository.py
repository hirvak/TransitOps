import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.Users.models import User
from app.Users.schemas import CreateUserRequest


class UserRepository:
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User | None:
        """
        Fetch user by email address.
        """
        stmt = select(User).where(User.email == email, User.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
        """
        Fetch user by primary key ID.
        """
        stmt = select(User).where(User.id == user_id, User.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def create_user(
        db: Session, 
        user_data: CreateUserRequest, 
        role_id: uuid.UUID, 
        hashed_password: str
    ) -> User:
        """
        Create and add a new user to the database session.
        Does NOT commit.
        """
        db_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role_id=role_id,
            phone=user_data.phone,
            profile_image=user_data.profile_image
        )
        db.add(db_user)
        # Flush to populate default values and primary key id before returning
        db.flush()
        return db_user
