import unittest
import uuid
import sys
from datetime import date, timedelta
from fastapi.testclient import TestClient
from loguru import logger

# Import app modules
from app.main import app
from app.Database.database import SessionLocal
from app.Users.models import User
from app.Drivers.models import Driver, DriverStatus
from app.Auth.models import Role
from app.Scripts.seed_roles import seed_roles

# Disable loguru output during tests to keep console output clean unless there's an error
logger.remove()
logger.add(sys.stderr, level="ERROR")


class TestDriverModule(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 1. Ensure database roles are seeded
        seed_roles()
        
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # 2. Generate unique email suffixes for test isolation
        suffix = uuid.uuid4().hex[:6]
        cls.admin_email = f"admin_{suffix}@example.com"
        cls.safety_email = f"safety_{suffix}@example.com"
        cls.dispatcher_email = f"dispatcher_{suffix}@example.com"

        # 3. Create test users
        cls.register_user(cls.admin_email, "ADMIN")
        cls.register_user(cls.safety_email, "SAFETY_OFFICER")
        cls.register_user(cls.dispatcher_email, "DISPATCHER")

        # 4. Authenticate users to acquire JWT tokens
        cls.admin_headers = cls.login_user(cls.admin_email)
        cls.safety_headers = cls.login_user(cls.safety_email)
        cls.dispatcher_headers = cls.login_user(cls.dispatcher_email)

    @classmethod
    def tearDownClass(cls):
        # Clean up database records created for testing
        cls.db.query(Driver).delete()
        cls.db.query(User).filter(User.email.in_([cls.admin_email, cls.safety_email, cls.dispatcher_email])).delete()
        cls.db.commit()
        cls.db.close()

    @classmethod
    def register_user(cls, email: str, role: str):
        response = cls.client.post("/auth/register", json={
            "email": email,
            "full_name": f"Test {role} User",
            "password": "Password123!",
            "role": role,
            "phone": "+1234567890"
        })
        if response.status_code != 201:
            raise Exception(f"Failed to register test user {email} (role: {role}): {response.text}")

    @classmethod
    def login_user(cls, email: str) -> dict:
        response = cls.client.post("/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        if response.status_code != 200:
            raise Exception(f"Failed to login user {email}: {response.text}")
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_01_rbac_permissions(self):
        """
        Verify that only ADMIN and SAFETY_OFFICER can access driver endpoints.
        """
        # Dispatcher should be forbidden (403)
        response = self.client.get("/drivers", headers=self.dispatcher_headers)
        self.assertEqual(response.status_code, 403)

        response = self.client.post("/drivers", json={}, headers=self.dispatcher_headers)
        self.assertEqual(response.status_code, 403)

        # Unauthenticated request should be unauthorized (401)
        response = self.client.get("/drivers")
        self.assertEqual(response.status_code, 401)

        # Admin and Safety Officer should be authorized (200)
        response = self.client.get("/drivers", headers=self.admin_headers)
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/drivers", headers=self.safety_headers)
        self.assertEqual(response.status_code, 200)

    def test_02_schema_validations(self):
        """
        Verify input validation rules: email format, phone format, and future-only license expiry.
        """
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        # Invalid email format (422)
        payload = {
            "full_name": "John Doe",
            "email": "not-an-email",
            "phone": "+1234567890",
            "license_number": "LIC-9991",
            "license_category": "Class A",
            "license_expiry": tomorrow
        }
        response = self.client.post("/drivers", json=payload, headers=self.admin_headers)
        self.assertEqual(response.status_code, 422)

        # Expiry in the past (422)
        payload["email"] = "valid_email@example.com"
        payload["license_expiry"] = yesterday
        response = self.client.post("/drivers", json=payload, headers=self.admin_headers)
        self.assertEqual(response.status_code, 422)
        self.assertIn("License expiry date cannot be in the past", response.text)

        # Invalid phone format (422)
        payload["license_expiry"] = tomorrow
        payload["phone"] = "abc123xyz"
        response = self.client.post("/drivers", json=payload, headers=self.admin_headers)
        self.assertEqual(response.status_code, 422)

        # Valid payload (201)
        payload["phone"] = "+1-555-555-5555"
        response = self.client.post("/drivers", json=payload, headers=self.admin_headers)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["status"], "AVAILABLE")
        self.assertEqual(data["safety_score"], 100.0)

    def test_03_duplicate_preventions(self):
        """
        Verify unique constraint validations for email and license number.
        """
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        
        # Base driver
        payload_base = {
            "full_name": "Base Driver",
            "email": "base_driver@example.com",
            "phone": "+9876543210",
            "license_number": "LIC-BASE",
            "license_category": "Class B",
            "license_expiry": tomorrow
        }
        response = self.client.post("/drivers", json=payload_base, headers=self.admin_headers)
        self.assertEqual(response.status_code, 201)

        # Duplicate email conflict (400)
        payload_dup_email = {
            "full_name": "Dup Email Driver",
            "email": "base_driver@example.com",
            "phone": "+9876543211",
            "license_number": "LIC-UNIQUE-1",
            "license_category": "Class B",
            "license_expiry": tomorrow
        }
        response = self.client.post("/drivers", json=payload_dup_email, headers=self.admin_headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Email already exists", response.json()["detail"])

        # Duplicate license conflict (400)
        payload_dup_lic = {
            "full_name": "Dup Lic Driver",
            "email": "unique_email_1@example.com",
            "phone": "+9876543212",
            "license_number": "LIC-BASE",
            "license_category": "Class B",
            "license_expiry": tomorrow
        }
        response = self.client.post("/drivers", json=payload_dup_lic, headers=self.admin_headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("License number already exists", response.json()["detail"])

    def test_04_driver_crud_and_status(self):
        """
        Verify updating fields, patching availability status, and soft deleting.
        """
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        payload = {
            "full_name": "CRUD Driver",
            "email": "crud_driver@example.com",
            "phone": "+1122334455",
            "license_number": "LIC-CRUD",
            "license_category": "Class C",
            "license_expiry": tomorrow
        }
        # 1. Create
        create_res = self.client.post("/drivers", json=payload, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 201)
        driver_id = create_res.json()["id"]

        # 2. Update Details
        update_payload = {
            "full_name": "CRUD Driver Updated",
            "phone": "+9988776655",
            "safety_score": 95.5
        }
        update_res = self.client.put(f"/drivers/{driver_id}", json=update_payload, headers=self.admin_headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["full_name"], "CRUD Driver Updated")
        self.assertEqual(update_res.json()["phone"], "+9988776655")
        self.assertEqual(update_res.json()["safety_score"], 95.5)

        # 3. Suspend
        suspend_res = self.client.patch(f"/drivers/{driver_id}/suspend", headers=self.admin_headers)
        self.assertEqual(suspend_res.status_code, 200)
        self.assertEqual(suspend_res.json()["status"], "SUSPENDED")

        # 4. Mark Available
        avail_res = self.client.patch(f"/drivers/{driver_id}/available", headers=self.admin_headers)
        self.assertEqual(avail_res.status_code, 200)
        self.assertEqual(avail_res.json()["status"], "AVAILABLE")

        # 5. Soft Delete
        del_res = self.client.delete(f"/drivers/{driver_id}", headers=self.admin_headers)
        self.assertEqual(del_res.status_code, 200)

        # 6. Verify Deleted driver is not retrievable via GET
        get_res = self.client.get(f"/drivers/{driver_id}", headers=self.admin_headers)
        self.assertEqual(get_res.status_code, 404)

    def test_05_listing_searching_sorting_filtering(self):
        """
        Verify search matches, pagination, sorting, status and category filtering.
        """
        # Clear drivers first to have clean stats
        self.db.query(Driver).delete()
        self.db.commit()

        tomorrow = (date.today() + timedelta(days=1))
        next_week = (date.today() + timedelta(days=7))

        drivers_data = [
            {"full_name": "Alice Driver", "email": "alice@example.com", "phone": "+1234500001", "license_number": "LIC-AAA", "license_category": "Heavy", "license_expiry": tomorrow, "safety_score": 90.0, "status": DriverStatus.AVAILABLE},
            {"full_name": "Bob Driver", "email": "bob@example.com", "phone": "+1234500002", "license_number": "LIC-BBB", "license_category": "Light", "license_expiry": next_week, "safety_score": 95.0, "status": DriverStatus.AVAILABLE},
            {"full_name": "Charlie Driver", "email": "charlie@example.com", "phone": "+1234500003", "license_number": "LIC-CCC", "license_category": "Heavy", "license_expiry": tomorrow, "safety_score": 85.0, "status": DriverStatus.SUSPENDED},
        ]

        for d in drivers_data:
            response = self.client.post("/drivers", json={
                "full_name": d["full_name"],
                "email": d["email"],
                "phone": d["phone"],
                "license_number": d["license_number"],
                "license_category": d["license_category"],
                "license_expiry": d["license_expiry"].isoformat(),
                "safety_score": d["safety_score"],
                "status": d["status"]
            }, headers=self.admin_headers)
            self.assertEqual(response.status_code, 201)

        # A. Verify Listing & Pagination
        list_res = self.client.get("/drivers?page=1&page_size=2", headers=self.admin_headers)
        self.assertEqual(list_res.status_code, 200)
        data = list_res.json()
        self.assertEqual(len(data["data"]), 2)
        self.assertEqual(data["pagination"]["total_records"], 3)
        self.assertEqual(data["pagination"]["total_pages"], 2)

        # B. Verify Search by Name
        search_res = self.client.get("/drivers?search=Bob", headers=self.admin_headers)
        self.assertEqual(search_res.status_code, 200)
        self.assertEqual(len(search_res.json()["data"]), 1)
        self.assertEqual(search_res.json()["data"][0]["full_name"], "Bob Driver")

        # C. Verify Filter by Status
        status_res = self.client.get("/drivers?status=SUSPENDED", headers=self.admin_headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(len(status_res.json()["data"]), 1)
        self.assertEqual(status_res.json()["data"][0]["full_name"], "Charlie Driver")

        # D. Verify Filter by License Category
        cat_res = self.client.get("/drivers?license_category=Heavy", headers=self.admin_headers)
        self.assertEqual(cat_res.status_code, 200)
        self.assertEqual(len(cat_res.json()["data"]), 2)

        # E. Verify Sorting (Safety Score, desc)
        sort_res = self.client.get("/drivers?sort_by=safety_score&sort_order=desc", headers=self.admin_headers)
        self.assertEqual(sort_res.status_code, 200)
        records = sort_res.json()["data"]
        self.assertEqual(records[0]["full_name"], "Bob Driver")  # 95.0
        self.assertEqual(records[1]["full_name"], "Alice Driver")  # 90.0
        self.assertEqual(records[2]["full_name"], "Charlie Driver")  # 85.0


if __name__ == "__main__":
    unittest.main()
