import unittest
import uuid
import sys
from datetime import date, timedelta
from fastapi.testclient import TestClient
from loguru import logger

from app.main import app
from app.Database.database import SessionLocal
from app.Users.models import User
from app.Vehicles.models import Vehicle, VehicleStatus, VehicleType
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus
from app.Scripts.seed_roles import seed_roles

logger.remove()
logger.add(sys.stderr, level="ERROR")

TODAY = date.today()
TOMORROW = TODAY + timedelta(days=1)
NEXT_WEEK = TODAY + timedelta(days=7)
YESTERDAY = TODAY - timedelta(days=1)


class TestMaintenanceModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        seed_roles()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        suffix = uuid.uuid4().hex[:6]
        cls.admin_email = f"maint_admin_{suffix}@example.com"
        cls.fleet_email = f"maint_fleet_{suffix}@example.com"
        cls.safety_email = f"maint_safety_{suffix}@example.com"
        cls.financial_email = f"maint_financial_{suffix}@example.com"
        cls.dispatcher_email = f"maint_dispatcher_{suffix}@example.com"

        for email, role in [
            (cls.admin_email, "ADMIN"),
            (cls.fleet_email, "FLEET_MANAGER"),
            (cls.safety_email, "SAFETY_OFFICER"),
            (cls.financial_email, "FINANCIAL_ANALYST"),
            (cls.dispatcher_email, "DISPATCHER"),
        ]:
            cls._register(email, role)

        cls.admin_h = cls._login(cls.admin_email)
        cls.fleet_h = cls._login(cls.fleet_email)
        cls.safety_h = cls._login(cls.safety_email)
        cls.financial_h = cls._login(cls.financial_email)
        cls.dispatcher_h = cls._login(cls.dispatcher_email)

        # Seed a test vehicle directly into the DB
        cls.vehicle = Vehicle(
            registration_number=f"TRK-{suffix}",
            vehicle_name="Test Truck",
            vehicle_model="Tata 407",
            vehicle_type=VehicleType.TRUCK,
            maximum_load_capacity=5000.0,
            odometer_reading=10000.0,
            acquisition_cost=500000.0,
            purchase_date=date(2022, 1, 1),
            status=VehicleStatus.AVAILABLE,
        )
        cls.db.add(cls.vehicle)
        cls.db.commit()
        cls.db.refresh(cls.vehicle)
        cls.vehicle_id = str(cls.vehicle.id)

    @classmethod
    def tearDownClass(cls):
        cls.db.query(MaintenanceLog).delete()
        cls.db.query(Vehicle).filter(Vehicle.id == cls.vehicle.id).delete()
        emails = [
            cls.admin_email, cls.fleet_email, cls.safety_email,
            cls.financial_email, cls.dispatcher_email
        ]
        cls.db.query(User).filter(User.email.in_(emails)).delete()
        cls.db.commit()
        cls.db.close()

    @classmethod
    def _register(cls, email, role):
        r = cls.client.post("/auth/register", json={
            "email": email, "full_name": f"Test {role}",
            "password": "Password123!", "role": role, "phone": "+1234567890"
        })
        assert r.status_code == 201, f"Register failed for {email}: {r.text}"

    @classmethod
    def _login(cls, email) -> dict:
        r = cls.client.post("/auth/login", json={"email": email, "password": "Password123!"})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def _reset_vehicle(self, new_status: VehicleStatus = VehicleStatus.AVAILABLE):
        """Reset the vehicle status so tests stay independent."""
        self.vehicle.status = new_status
        self.db.commit()
        self.db.refresh(self.vehicle)

    def _delete_all_maintenance(self):
        """Clean all maintenance records for this vehicle."""
        self.db.query(MaintenanceLog).filter(
            MaintenanceLog.vehicle_id == self.vehicle.id
        ).delete()
        self.db.commit()

    # ------------------------------------------------------------------ #
    # 1. RBAC
    # ------------------------------------------------------------------ #
    def test_01_rbac(self):
        """Dispatcher cannot read or write. Safety/Financial can read only."""
        # Dispatcher → 403 on read and write
        self.assertEqual(self.client.get("/maintenance", headers=self.dispatcher_h).status_code, 403)
        self.assertEqual(
            self.client.post("/maintenance", json={}, headers=self.dispatcher_h).status_code, 403
        )

        # Safety Officer → 200 on GET list, 403 on POST
        self.assertEqual(self.client.get("/maintenance", headers=self.safety_h).status_code, 200)
        self.assertEqual(
            self.client.post("/maintenance", json={}, headers=self.safety_h).status_code, 403
        )

        # Financial Analyst → 200 on GET list, 403 on POST
        self.assertEqual(self.client.get("/maintenance", headers=self.financial_h).status_code, 200)
        self.assertEqual(
            self.client.post("/maintenance", json={}, headers=self.financial_h).status_code, 403
        )

        # Unauthenticated → 401
        self.assertEqual(self.client.get("/maintenance").status_code, 401)

        # Admin and Fleet Manager → 200 on list
        self.assertEqual(self.client.get("/maintenance", headers=self.admin_h).status_code, 200)
        self.assertEqual(self.client.get("/maintenance", headers=self.fleet_h).status_code, 200)

    # ------------------------------------------------------------------ #
    # 2. Business validations on create
    # ------------------------------------------------------------------ #
    def test_02_create_on_trip_vehicle_rejected(self):
        """Cannot create maintenance for ON_TRIP vehicle."""
        self._reset_vehicle(VehicleStatus.ON_TRIP)
        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Oil Change",
            "description": "Routine oil change",
            "estimated_cost": 500.0,
            "scheduled_date": TOMORROW.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 400)
        self.assertIn("on a trip", r.json()["detail"])
        self._reset_vehicle()

    def test_03_create_retired_vehicle_rejected(self):
        """Cannot create maintenance for RETIRED vehicle."""
        self._reset_vehicle(VehicleStatus.RETIRED)
        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Brake Check",
            "description": "Brake inspection",
            "estimated_cost": 200.0,
            "scheduled_date": TOMORROW.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Retired", r.json()["detail"])
        self._reset_vehicle()

    def test_04_negative_cost_rejected(self):
        """Estimated cost <= 0 should return 422."""
        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Tyre Rotation",
            "description": "All tyres rotated",
            "estimated_cost": -100.0,
            "scheduled_date": TOMORROW.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 422)

    # ------------------------------------------------------------------ #
    # 3. Full lifecycle
    # ------------------------------------------------------------------ #
    def test_05_full_lifecycle(self):
        """
        Create → vehicle goes IN_SHOP.
        Start → IN_PROGRESS.
        Complete → COMPLETED, vehicle goes AVAILABLE.
        """
        self._reset_vehicle()
        self._delete_all_maintenance()

        # Create
        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Engine Overhaul",
            "description": "Full engine overhaul service",
            "estimated_cost": 15000.0,
            "scheduled_date": TODAY.isoformat(),
        }, headers=self.fleet_h)
        self.assertEqual(r.status_code, 201)
        mid = r.json()["id"]
        self.assertEqual(r.json()["status"], "PENDING")

        # Vehicle must be IN_SHOP
        self.db.refresh(self.vehicle)
        self.assertEqual(self.vehicle.status, VehicleStatus.IN_SHOP)

        # Start
        r = self.client.patch(f"/maintenance/{mid}/start", headers=self.fleet_h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "IN_PROGRESS")

        # Complete with a valid completion date
        r = self.client.patch(f"/maintenance/{mid}/complete", json={
            "completion_date": NEXT_WEEK.isoformat(),
            "actual_cost": 14000.0,
            "remarks": "All good",
        }, headers=self.fleet_h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "COMPLETED")
        self.assertEqual(r.json()["actual_cost"], 14000.0)

        # Vehicle must be AVAILABLE again
        self.db.refresh(self.vehicle)
        self.assertEqual(self.vehicle.status, VehicleStatus.AVAILABLE)

    def test_06_duplicate_active_maintenance_rejected(self):
        """Cannot create maintenance if vehicle already has PENDING or IN_PROGRESS record."""
        self._reset_vehicle()
        self._delete_all_maintenance()

        r1 = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Tyre Change",
            "description": "Change all 4 tyres",
            "estimated_cost": 8000.0,
            "scheduled_date": TOMORROW.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r1.status_code, 201)

        # Second request while first is still PENDING → 400
        r2 = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Oil Change",
            "description": "Oil change",
            "estimated_cost": 500.0,
            "scheduled_date": NEXT_WEEK.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r2.status_code, 400)
        self.assertIn("active maintenance", r2.json()["detail"])

    def test_07_cancel_restores_vehicle(self):
        """Cancelling PENDING maintenance restores vehicle to AVAILABLE."""
        self._reset_vehicle()
        self._delete_all_maintenance()

        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "AC Repair",
            "description": "Fix air conditioning",
            "estimated_cost": 3000.0,
            "scheduled_date": TOMORROW.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 201)
        mid = r.json()["id"]
        self.assertEqual(self.vehicle.status, VehicleStatus.IN_SHOP)

        # Cancel
        r = self.client.patch(f"/maintenance/{mid}/cancel", headers=self.admin_h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "CANCELLED")

        self.db.refresh(self.vehicle)
        self.assertEqual(self.vehicle.status, VehicleStatus.AVAILABLE)

    def test_08_invalid_completion_date_rejected(self):
        """Completion date earlier than scheduled_date → 400."""
        self._reset_vehicle()
        self._delete_all_maintenance()

        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Brake Pad",
            "description": "Brake pad replacement",
            "estimated_cost": 2000.0,
            "scheduled_date": NEXT_WEEK.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 201)
        mid = r.json()["id"]

        # Start it
        self.client.patch(f"/maintenance/{mid}/start", headers=self.admin_h)

        # Complete with a date before scheduled_date
        r = self.client.patch(f"/maintenance/{mid}/complete", json={
            "completion_date": TODAY.isoformat(),  # earlier than NEXT_WEEK
            "actual_cost": 1900.0,
            "remarks": "",
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 400)
        self.assertIn("earlier than the scheduled date", r.json()["detail"])

    def test_09_soft_delete_rules(self):
        """Only COMPLETED or CANCELLED records can be soft-deleted."""
        self._reset_vehicle()
        self._delete_all_maintenance()

        r = self.client.post("/maintenance", json={
            "vehicle_id": self.vehicle_id,
            "maintenance_type": "Coolant Flush",
            "description": "Coolant system flush",
            "estimated_cost": 1200.0,
            "scheduled_date": TOMORROW.isoformat(),
        }, headers=self.admin_h)
        self.assertEqual(r.status_code, 201)
        mid = r.json()["id"]

        # Cannot delete PENDING record
        r = self.client.delete(f"/maintenance/{mid}", headers=self.admin_h)
        self.assertEqual(r.status_code, 400)
        self.assertIn("COMPLETED or CANCELLED", r.json()["detail"])

        # Cancel it, then delete
        self.client.patch(f"/maintenance/{mid}/cancel", headers=self.admin_h)
        r = self.client.delete(f"/maintenance/{mid}", headers=self.admin_h)
        self.assertEqual(r.status_code, 200)

        # Deleted record should not be retrievable
        r = self.client.get(f"/maintenance/{mid}", headers=self.admin_h)
        self.assertEqual(r.status_code, 404)

    def test_10_statistics_and_search(self):
        """Statistics endpoint returns accurate counts. Search works by type."""
        self._reset_vehicle()
        self._delete_all_maintenance()

        # Create two maintenance records
        for mtype in ["Gearbox Service", "Suspension Check"]:
            r = self.client.post("/maintenance", json={
                "vehicle_id": self.vehicle_id,
                "maintenance_type": mtype,
                "description": f"{mtype} description",
                "estimated_cost": 5000.0,
                "scheduled_date": TOMORROW.isoformat(),
            }, headers=self.admin_h)
            self.assertEqual(r.status_code, 201)
            # Cancel it so next one can be created (frees vehicle)
            mid = r.json()["id"]
            self.client.patch(f"/maintenance/{mid}/cancel", headers=self.admin_h)

        # Statistics
        r = self.client.get("/maintenance/statistics", headers=self.admin_h)
        self.assertEqual(r.status_code, 200)
        stats = r.json()
        self.assertIn("total_records", stats)
        self.assertGreaterEqual(stats["cancelled"], 2)

        # Search
        r = self.client.get("/maintenance?search=Gearbox", headers=self.admin_h)
        self.assertEqual(r.status_code, 200)
        results = r.json()["data"]
        self.assertTrue(any("Gearbox" in d["maintenance_type"] for d in results))

        # Filter by status
        r = self.client.get("/maintenance?status=CANCELLED", headers=self.admin_h)
        self.assertEqual(r.status_code, 200)
        for rec in r.json()["data"]:
            self.assertEqual(rec["status"], "CANCELLED")


if __name__ == "__main__":
    unittest.main()
