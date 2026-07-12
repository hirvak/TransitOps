from fastapi import FastAPI

from app.Auth.api import router as auth_router
# Import all models to register them in SQLAlchemy mapper registry
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle
from app.Drivers.models import Driver
from app.Trips.models import Trip

app = FastAPI(
    title="TransitOps API",
    version="1.0.0",
    description="Smart Transport Operations Platform"
)

app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "TransitOps Backend Running"
    }