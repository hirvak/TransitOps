from loguru import logger
from app.Database.database import SessionLocal
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle
from app.Drivers.models import Driver
from app.Trips.models import Trip
from app.Utils.constants import (
    ROLE_ADMIN,
    ROLE_FLEET_MANAGER,
    ROLE_DISPATCHER,
    ROLE_SAFETY_OFFICER,
    ROLE_FINANCIAL_ANALYST,
)


def seed_roles():
    """
    Idempotent script to seed default database roles: ADMIN, FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER, FINANCIAL_ANALYST.
    """
    logger.info("Starting role seeding script...")
    db = SessionLocal()
    try:
        roles_to_seed = [
            ROLE_ADMIN,
            ROLE_FLEET_MANAGER,
            ROLE_DISPATCHER,
            ROLE_SAFETY_OFFICER,
            ROLE_FINANCIAL_ANALYST,
        ]
        for role_name in roles_to_seed:
            existing_role = db.query(Role).filter(Role.name == role_name, Role.is_deleted == False).first()
            if not existing_role:
                new_role = Role(
                    name=role_name,
                    description=f"Default role for {role_name}"
                )
                db.add(new_role)
                logger.info(f"Seeding new role: {role_name}")
            else:
                logger.info(f"Role already exists, skipping: {role_name}")
        
        db.commit()
        logger.info("Role seeding completed successfully!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error occurred during role seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
