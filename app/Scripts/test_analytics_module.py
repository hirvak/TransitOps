import uuid
from fastapi.testclient import TestClient
from sqlalchemy import select
from datetime import date, datetime, timedelta

from app.main import app
from app.Database.database import SessionLocal
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle, VehicleStatus, VehicleType
from app.Drivers.models import Driver, DriverStatus
from app.Trips.models import Trip, TripStatus
from app.FuelExpense.models import FuelLog, Expense, FuelType, ExpenseType
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus

client = TestClient(app)

def test_analytics_workflow():
    db = SessionLocal()

    # 1. Truncate operational data & clean test users
    db.query(FuelLog).delete()
    db.query(Expense).delete()
    db.query(MaintenanceLog).delete()
    db.query(Trip).delete()

    test_emails = ["admin_an@example.com", "fa_an@example.com", "disp_an@example.com"]
    for email in test_emails:
        u = db.query(User).filter(User.email == email).first()
        if u:
            db.delete(u)

    veh = db.query(Vehicle).filter(Vehicle.registration_number == "TRK-AN-101").first()
    if veh:
        db.delete(veh)

    drv = db.query(Driver).filter(Driver.email == "driveran@example.com").first()
    if drv:
        db.delete(drv)

    db.commit()

    # 2. Get Roles
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    fa_role = db.query(Role).filter(Role.name == "FINANCIAL_ANALYST").first()
    disp_role = db.query(Role).filter(Role.name == "DISPATCHER").first()

    # Setup User Passwords
    from app.Security.password import hash_password
    admin_user = User(email="admin_an@example.com", hashed_password=hash_password("AdminPass123!"), full_name="Admin AN", role_id=admin_role.id, is_active=True)
    fa_user = User(email="fa_an@example.com", hashed_password=hash_password("FaPass123!"), full_name="Financial Analyst AN", role_id=fa_role.id, is_active=True)
    disp_user = User(email="disp_an@example.com", hashed_password=hash_password("DispPass123!"), full_name="Disp AN", role_id=disp_role.id, is_active=True)

    db.add_all([admin_user, fa_user, disp_user])
    db.commit()

    # Get login headers
    def login(email, pwd):
        resp = client.post("/auth/token", data={"username": email, "password": pwd})
        assert resp.status_code == 200
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    admin_headers = login("admin_an@example.com", "AdminPass123!")
    fa_headers = login("fa_an@example.com", "FaPass123!")
    disp_headers = login("disp_an@example.com", "DispPass123!")

    # Create Vehicle
    veh_1 = Vehicle(
        id=uuid.uuid4(),
        registration_number="TRK-AN-101",
        vehicle_name="Analytics Truck",
        vehicle_model="Volvo FMX",
        vehicle_type=VehicleType.TRUCK,
        maximum_load_capacity=20000.0,
        odometer_reading=50000.0,
        acquisition_cost=80000.0,
        purchase_date=date.today() - timedelta(days=90),
        status=VehicleStatus.AVAILABLE,
        region="Midwest"
    )
    db.add(veh_1)

    # Create Driver
    driver_1 = Driver(
        id=uuid.uuid4(),
        full_name="Driver Analytics",
        email="driveran@example.com",
        phone="555-9011",
        license_number="CDLAN882",
        license_category="Class A",
        license_expiry=date.today() + timedelta(days=365),
        safety_score=95.0,
        status=DriverStatus.AVAILABLE,
        is_active=True
    )
    db.add(driver_1)
    db.commit()

    db.refresh(veh_1)
    db.refresh(driver_1)

    # Create Completed Trip
    trip_1 = Trip(
        id=uuid.uuid4(),
        trip_number="TRIP-AN-001",
        origin="Chicago",
        destination="Detroit",
        vehicle_id=veh_1.id,
        driver_id=driver_1.id,
        created_by_id=admin_user.id,
        cargo_weight=12000.0,
        planned_distance=450.0,
        actual_distance=460.0,
        fuel_consumed=90.0,
        revenue=1500.0,
        start_odometer=50000.0,
        end_odometer=50460.0,
        planned_departure=datetime.now() - timedelta(days=2),
        dispatch_time=datetime.now() - timedelta(days=2),
        completion_time=datetime.now() - timedelta(days=1),
        status=TripStatus.COMPLETED
    )
    db.add(trip_1)

    # Create Maintenance Log
    maint_1 = MaintenanceLog(
        id=uuid.uuid4(),
        vehicle_id=veh_1.id,
        maintenance_type="PM",
        description="Preventative Maintenance",
        estimated_cost=200.0,
        actual_cost=250.0,
        status=MaintenanceStatus.COMPLETED,
        scheduled_date=date.today() - timedelta(days=5),
        completion_date=date.today() - timedelta(days=4)
    )
    db.add(maint_1)
    db.commit()

    db.refresh(trip_1)
    db.refresh(maint_1)

    # Create Fuel Log
    fuel_1 = FuelLog(
        id=uuid.uuid4(),
        vehicle_id=veh_1.id,
        trip_id=trip_1.id,
        fuel_type=FuelType.DIESEL,
        station_name="Shell",
        fuel_quantity=100.0,
        price_per_liter=1.50,
        total_cost=150.0,
        odometer_reading=50460.0,
        fuel_date=date.today() - timedelta(days=1),
        created_by_id=admin_user.id
    )
    db.add(fuel_1)

    # Create Expense
    exp_1 = Expense(
        id=uuid.uuid4(),
        vehicle_id=veh_1.id,
        trip_id=trip_1.id,
        expense_type=ExpenseType.TOLL,
        amount=40.0,
        expense_date=date.today() - timedelta(days=1),
        description="Toll expense",
        created_by_id=admin_user.id
    )
    db.add(exp_1)
    db.commit()

    fuel_1_id = fuel_1.id
    exp_1_id = exp_1.id
    maint_1_id = maint_1.id
    trip_1_id = trip_1.id
    veh_1_id = veh_1.id
    driver_1_id = driver_1.id

    # 3. Verify RBAC Guard (Dispatcher blocked)
    resp = client.get("/dashboard", headers=disp_headers)
    assert resp.status_code == 403

    resp = client.get("/reports/vehicles", headers=disp_headers)
    assert resp.status_code == 403

    resp = client.get("/export/vehicles/csv", headers=disp_headers)
    assert resp.status_code == 403

    # Financial Analyst passes
    resp = client.get("/dashboard", headers=fa_headers)
    assert resp.status_code == 200

    # 4. Verify Dashboard KPIs
    resp = client.get("/dashboard", headers=fa_headers)
    assert resp.status_code == 200
    db_kpis = resp.json()
    kpis = db_kpis.get("kpis", db_kpis)
    assert kpis["fleet"]["total_vehicles"] >= 1
    assert kpis["fuel"]["total_fuel_quantity"] == 100.0
    assert kpis["fuel"]["total_fuel_cost"] == 150.0
    assert kpis["expenses"]["total_expenses"] == 40.0
    assert kpis["expenses"]["maintenance_cost"] == 250.0
    # operational_cost = 150.0 (fuel) + 40.0 (expense) + 250.0 (maintenance) = 440.0
    assert kpis["expenses"]["operational_cost"] == 440.0
    assert kpis["financial"]["total_revenue"] == 1500.0
    # net profit = 1500.0 - 440.0 = 1060.0
    assert kpis["financial"]["net_profit"] == 1060.0

    # 5. Verify Charts Endpoint
    resp = client.get("/dashboard/charts", headers=fa_headers)
    assert resp.status_code == 200
    charts = resp.json()
    assert len(charts["monthly_trips"]) >= 1
    assert len(charts["monthly_revenue"]) >= 1
    assert len(charts["vehicle_status_pie"]) >= 1

    # 6. Verify Reports Endpoints
    # Vehicles Report
    resp = client.get("/reports/vehicles?search=TRK-AN-101&page=1&page_size=10", headers=fa_headers)
    assert resp.status_code == 200
    v_report = resp.json()
    assert len(v_report["data"]) == 1
    assert v_report["data"][0]["registration_number"] == "TRK-AN-101"
    assert v_report["data"][0]["trips_completed"] == 1
    assert v_report["data"][0]["distance"] == 460.0
    assert v_report["data"][0]["fuel_cost"] == 150.0
    assert v_report["data"][0]["maintenance_cost"] == 250.0
    assert v_report["data"][0]["expense_cost"] == 40.0
    assert v_report["data"][0]["revenue"] == 1500.0
    assert v_report["data"][0]["profit"] == 1060.0
    assert v_report["data"][0]["fuel_efficiency"] == 4.6 # 460 / 100

    # Drivers Report
    resp = client.get("/reports/drivers?search=Driver Analytics", headers=fa_headers)
    assert resp.status_code == 200
    d_report = resp.json()
    assert len(d_report["data"]) == 1
    assert d_report["data"][0]["full_name"] == "Driver Analytics"
    assert d_report["data"][0]["trips_completed"] == 1

    # Financial Report
    resp = client.get("/reports/financial", headers=fa_headers)
    assert resp.status_code == 200
    fin_report = resp.json()
    assert fin_report["revenue"] == 1500.0
    assert fin_report["net_profit"] == 1060.0
    assert fin_report["profit_margin"] == (1060.0 / 1500.0 * 100.0)

    # 7. Verify Export Endpoints
    # CSV Export
    resp = client.get("/export/vehicles/csv", headers=fa_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert "TRK-AN-101" in resp.text
    assert "Analytics Truck" in resp.text

    # PDF Exporter (dashboard summary)
    resp = client.get("/export/dashboard/pdf", headers=fa_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert len(resp.content) > 0

    # PDF Exporter (vehicles list)
    resp = client.get("/export/vehicles/pdf", headers=fa_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert len(resp.content) > 0

    # 8. Cleanup
    db = SessionLocal()
    for email in test_emails:
        u = db.query(User).filter(User.email == email).first()
        if u:
            db.delete(u)

    db.query(FuelLog).filter(FuelLog.id == fuel_1_id).delete()
    db.query(Expense).filter(Expense.id == exp_1_id).delete()
    db.query(MaintenanceLog).filter(MaintenanceLog.id == maint_1_id).delete()
    db.query(Trip).filter(Trip.id == trip_1_id).delete()

    v1 = db.query(Vehicle).filter(Vehicle.id == veh_1_id).first()
    if v1:
        db.delete(v1)

    d1 = db.query(Driver).filter(Driver.id == driver_1_id).first()
    if d1:
        db.delete(d1)

    db.commit()
    db.close()

    print("All Analytics Module integration tests passed successfully!")

if __name__ == "__main__":
    test_analytics_workflow()
