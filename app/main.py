from fastapi import FastAPI

from app.Auth.api import router as auth_router
from app.Users.api import router as users_router
from app.Drivers.api import router as drivers_router
# Import all models to register them in SQLAlchemy mapper registry
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle, VehicleDocument
from app.Drivers.models import Driver
from app.Trips.models import Trip
from app.Maintenance.models import MaintenanceLog
from app.Fuel.models import FuelLog
from app.Expenses.models import Expense

app = FastAPI(
    title="TransitOps API",
    version="1.0.0",
    description="Smart Transport Operations Platform"
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(drivers_router)


@app.get("/")
def root():
    return {
        "message": "TransitOps Backend Running"
    }