import uuid
from typing import Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import select, func

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

    @staticmethod
    def get_paginated_users(
        db: Session,
        page: int,
        page_size: int,
        search: str | None,
        role_name: str | None,
        is_active: bool | None,
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[User], int]:
        """
        Fetch paginated list of users based on search, filtering, and sorting parameters.
        Returns a tuple of (users_list, total_records).
        """
        # Base query
        stmt = select(User).where(User.is_deleted == False)

        # Filters
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        if role_name:
            from app.Auth.models import Role
            stmt = stmt.join(User.role).where(Role.name == role_name, Role.is_deleted == False)

        # Search
        if search:
            # Match name or email case-insensitively
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                (User.full_name.ilike(search_pattern)) | 
                (User.email.ilike(search_pattern))
            )

        # Sorting
        sort_column = User.created_at
        if sort_by == "name":
            sort_column = User.full_name
        elif sort_by == "email":
            sort_column = User.email

        if sort_order == "desc":
            stmt = stmt.order_by(sort_column.desc())
        else:
            stmt = stmt.order_by(sort_column.asc())

        # Total count query before limit/offset
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_records = db.scalar(count_stmt) or 0

        # Pagination limit/offset
        offset_value = (page - 1) * page_size
        stmt = stmt.offset(offset_value).limit(page_size)

        users = list(db.scalars(stmt).all())
        return users, total_records

    @staticmethod
    def get_users_statistics(db: Session) -> dict:
        """
        Retrieve user statistics (total, active, inactive, and by role counts).
        """
        from app.Auth.models import Role

        # Total, active, inactive queries
        total_stmt = select(func.count(User.id)).where(User.is_deleted == False)
        total_users = db.scalar(total_stmt) or 0

        active_stmt = select(func.count(User.id)).where(User.is_active == True, User.is_deleted == False)
        active_users = db.scalar(active_stmt) or 0

        inactive_users = total_users - active_users

        # Roles breakdown
        role_stmt = (
            select(Role.name, func.count(User.id))
            .join(User.role)
            .where(User.is_deleted == False, Role.is_deleted == False)
            .group_by(Role.name)
        )
        role_counts = db.execute(role_stmt).all()
        roles_dict = {role_name: count for role_name, count in role_counts}

        # Initialize all known roles to 0 if not present in the count
        from app.Utils.constants import (
            ROLE_ADMIN,
            ROLE_FLEET_MANAGER,
            ROLE_DISPATCHER,
            ROLE_SAFETY_OFFICER,
            ROLE_FINANCIAL_ANALYST,
        )
        all_roles = [ROLE_ADMIN, ROLE_FLEET_MANAGER, ROLE_DISPATCHER, ROLE_SAFETY_OFFICER, ROLE_FINANCIAL_ANALYST]
        for r in all_roles:
            if r not in roles_dict:
                roles_dict[r] = 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "roles": roles_dict
        }

    @staticmethod
    def update_user_fields(db: Session, user: User, updates: dict) -> User:
        """
        Update fields on an existing User object. Does NOT commit.
        """
        for key, value in updates.items():
            setattr(user, key, value)
        db.flush()
        return user

    @staticmethod
    def soft_delete_user(db: Session, user: User) -> User:
        """
        Soft delete a user by setting is_deleted=True. Does NOT commit.
        """
        user.is_deleted = True
        db.flush()
        return user
