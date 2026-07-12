from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

from app.Auth.api import router as auth_router
from app.Users.api import router as users_router
# Import all models to register them in SQLAlchemy mapper registry
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle, VehicleDocument
from app.Drivers.models import Driver
from app.Trips.models import Trip
from app.Maintenance.models import MaintenanceLog
from app.FuelExpense.models import FuelLog, Expense
from app.Notifications.models import Notification
from app.Vehicles.api import router as vehicle_router, document_router as vehicle_document_router
from app.Drivers.api import router as driver_router
from app.Trips.api import router as trip_router
from app.FuelExpense.api import fuel_router, expense_router
from app.Maintenance.api import router as maintenance_router
from app.Analytics.api import dashboard_router, reports_router, export_router
from app.Notifications.api import router as notification_router

app = FastAPI(
    title="TransitOps API",
    version="1.0.0",
    description="Smart Transport Operations Platform"
)

app.include_router(auth_router)
app.include_router(users_router)

app.include_router(vehicle_router)
app.include_router(vehicle_document_router)
app.include_router(driver_router)
app.include_router(trip_router)
app.include_router(fuel_router)
app.include_router(expense_router)
app.include_router(maintenance_router)
app.include_router(notification_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(export_router)

# Mount uploads directory to serve static file downloads
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/vehicle_documents", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {
        "message": "TransitOps Backend Running"
    }
