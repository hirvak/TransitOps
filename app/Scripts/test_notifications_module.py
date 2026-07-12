import uuid
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.Database.database import SessionLocal
from app.Auth.models import Role
from app.Users.models import User
from app.Vehicles.models import Vehicle, VehicleStatus, VehicleType, VehicleDocument, DocumentType
from app.Drivers.models import Driver, DriverStatus
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus
from app.Notifications.models import Notification, NotificationType

client = TestClient(app)

def run_integration_tests():
    print("Initializing test database connection and cleaning tables...")
    db = SessionLocal()

    # Truncate tables to ensure isolated testing
    db.query(Notification).delete()
    db.query(VehicleDocument).delete()
    db.query(MaintenanceLog).delete()
    db.query(Driver).delete()
    db.query(Vehicle).delete()
    
    test_emails = ["admin_notif@example.com", "fm_notif@example.com", "so_notif@example.com", "disp_notif@example.com"]
    for email in test_emails:
        u = db.query(User).filter(User.email == email).first()
        if u:
            db.delete(u)
    db.commit()

    # Fetch roles
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    fm_role = db.query(Role).filter(Role.name == "FLEET_MANAGER").first()
    so_role = db.query(Role).filter(Role.name == "SAFETY_OFFICER").first()
    disp_role = db.query(Role).filter(Role.name == "DISPATCHER").first()

    # Create test users
    from app.Security.password import hash_password
    admin_user = User(email="admin_notif@example.com", hashed_password=hash_password("Pass123!"), full_name="Admin Notif", role_id=admin_role.id, is_active=True)
    fm_user = User(email="fm_notif@example.com", hashed_password=hash_password("Pass123!"), full_name="FM Notif", role_id=fm_role.id, is_active=True)
    so_user = User(email="so_notif@example.com", hashed_password=hash_password("Pass123!"), full_name="SO Notif", role_id=so_role.id, is_active=True)
    disp_user = User(email="disp_notif@example.com", hashed_password=hash_password("Pass123!"), full_name="Disp Notif", role_id=disp_role.id, is_active=True)

    db.add_all([admin_user, fm_user, so_user, disp_user])
    db.commit()

    def login(email, password):
        resp = client.post("/auth/token", data={"username": email, "password": password})
        assert resp.status_code == 200, f"Login failed for {email}"
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    admin_headers = login("admin_notif@example.com", "Pass123!")
    fm_headers = login("fm_notif@example.com", "Pass123!")
    so_headers = login("so_notif@example.com", "Pass123!")
    disp_headers = login("disp_notif@example.com", "Pass123!")

    # 1. Verify RBAC permissions on Notifications
    print("Testing Notification RBAC permissions...")
    # SO can read
    r1 = client.get("/notifications", headers=so_headers)
    assert r1.status_code == 200, "Safety Officer should have read access to notifications."
    
    # Disp cannot read
    r2 = client.get("/notifications", headers=disp_headers)
    assert r2.status_code == 403, "Dispatcher should not have read access to notifications."
    
    # SO cannot generate/write
    r3 = client.post("/notifications/generate", headers=so_headers)
    assert r3.status_code == 403, "Safety Officer should not have write/generate access to notifications."

    # FM can generate/write
    r4 = client.post("/notifications/generate", headers=fm_headers)
    assert r4.status_code == 200, "Fleet Manager should have write/generate access to notifications."

    # 2. Test Vehicle Document CRUD and constraints
    print("Testing Vehicle Document CRUD operations & business rules...")
    # Create test vehicle
    vehicle_1 = Vehicle(
        id=uuid.uuid4(),
        registration_number="TRK-NOTIF-101",
        vehicle_name="Notification Test Truck",
        vehicle_model="Kenworth T680",
        vehicle_type=VehicleType.TRUCK,
        maximum_load_capacity=15000.0,
        odometer_reading=12000.0,
        acquisition_cost=95000.0,
        purchase_date=date.today() - timedelta(days=60),
        status=VehicleStatus.AVAILABLE,
        region="Southeast"
    )
    db.add(vehicle_1)
    db.commit()
    db.refresh(vehicle_1)

    doc_data = {
        "vehicle_id": str(vehicle_1.id),
        "document_name": "Cargo Transport Permit",
        "document_type": "INSURANCE",
        "document_number": "INS-NOTIF-777",
        "file_name": "insurance_card.pdf",
        "file_path": "uploads/vehicle_documents/insurance_card.pdf",
        "issue_date": str(date.today() - timedelta(days=20)),
        "expiry_date": str(date.today() + timedelta(days=15)),
        "remarks": "Semi-annual insurance cert"
    }

    # Validate Issue Date <= Expiry Date
    bad_doc_data = doc_data.copy()
    bad_doc_data["issue_date"] = str(date.today() + timedelta(days=25)) # issue > expiry
    resp_bad_dates = client.post("/vehicle-documents", json=bad_doc_data, headers=fm_headers)
    assert resp_bad_dates.status_code == 400, "Should refuse document creation when issue date is after expiry date."
    assert "Issue date" in resp_bad_dates.json()["detail"]

    # Successful creation
    resp_create = client.post("/vehicle-documents", json=doc_data, headers=fm_headers)
    assert resp_create.status_code == 201, f"Failed to create vehicle document: {resp_create.json()}"
    doc_id = resp_create.json()["id"]

    # Check duplicate document type blocking
    resp_dup = client.post("/vehicle-documents", json=doc_data, headers=fm_headers)
    assert resp_dup.status_code == 400, "Should prevent duplicate document types for the same vehicle."

    # Update document remarks
    update_data = {"remarks": "Updated insurance cert comment."}
    resp_update = client.put(f"/vehicle-documents/{doc_id}", json=update_data, headers=fm_headers)
    assert resp_update.status_code == 200
    assert resp_update.json()["remarks"] == "Updated insurance cert comment."

    # 3. Create expiring/overdue items to trigger notifications
    print("Testing Notification generation scanner...")
    # Driver expiring in 5 days (Critical Alert)
    driver_exp = Driver(
        id=uuid.uuid4(),
        full_name="Driver Expiring License",
        email="drv_exp@example.com",
        phone="555-1111",
        license_number="DL-NOTIF-99",
        license_category="Class A",
        license_expiry=date.today() + timedelta(days=5),
        safety_score=85.0,
        status=DriverStatus.AVAILABLE,
        is_active=True
    )
    db.add(driver_exp)

    # Maintenance overdue (Critical Alert)
    maint_overdue = MaintenanceLog(
        id=uuid.uuid4(),
        vehicle_id=vehicle_1.id,
        maintenance_type="PM",
        description="Overdue PM oil change",
        estimated_cost=300.0,
        status=MaintenanceStatus.PENDING,
        scheduled_date=date.today() - timedelta(days=2)
    )
    db.add(maint_overdue)
    db.commit()

    # Trigger scan
    resp_gen = client.post("/notifications/generate", headers=fm_headers)
    assert resp_gen.status_code == 200
    
    # Retrieve all notifications
    resp_list = client.get("/notifications", headers=so_headers)
    notifications = resp_list.json()
    assert len(notifications) >= 3, f"Expected at least 3 generated notifications, got {len(notifications)}"

    # Check titles to verify matching notifications
    titles = [n["title"] for n in notifications]
    print(f"Generated titles: {titles}")
    assert any("Driver License Expiry (7 Days)" in t for t in titles), "Expected Driver License Expiry warning."
    assert any("Vehicle Document Expiring (15 Days)" in t for t in titles), "Expected Vehicle Document Expiry warning."
    assert any("Maintenance Overdue Alert" in t for t in titles), "Expected Maintenance Overdue alert."

    # Mark single read
    notif_id = notifications[0]["id"]
    resp_read = client.patch(f"/notifications/{notif_id}/read", headers=fm_headers)
    assert resp_read.status_code == 200
    assert resp_read.json()["is_read"] is True

    # 4. Check dashboard alerts API
    print("Testing dashboard alerts aggregates...")
    resp_alerts = client.get("/dashboard/alerts", headers=so_headers)
    assert resp_alerts.status_code == 200
    alert_data = resp_alerts.json()
    assert len(alert_data["critical"]) >= 2
    assert len(alert_data["warning"]) >= 1

    # 5. Check unified dashboard API
    print("Testing unified dashboard structure...")
    resp_dash = client.get("/dashboard", headers=so_headers)
    assert resp_dash.status_code == 200
    dash_data = resp_dash.json()
    assert "kpis" in dash_data
    assert "charts" in dash_data
    assert "alerts" in dash_data
    assert "summary" in dash_data

    # 6. Test Exporters output checks
    print("Testing PDF & CSV export indicators...")
    # CSV Alert export
    resp_csv = client.get("/export/alerts/csv", headers=so_headers)
    assert resp_csv.status_code == 200
    csv_text = resp_csv.text
    # Verify presence of UTF-8 BOM
    assert csv_text.startswith('\ufeff'), "CSV export must contain UTF-8 BOM signature."
    # Verify contents
    assert "INSURANCE" in csv_text, "CSV export should contain INSURANCE document type."
    assert "Driver Expiring License" in csv_text, "CSV export should contain the expiring driver name."
    assert "PM" in csv_text, "CSV export should contain the overdue PM maintenance log."

    # PDF Alert export
    resp_pdf = client.get("/export/alerts/pdf", headers=so_headers)
    assert resp_pdf.status_code == 200
    assert resp_pdf.content.startswith(b"%PDF"), "PDF export must contain valid PDF bytes starting with '%PDF'."

    # 7. Soft deletion validation
    print("Testing soft deletion on notifications and documents...")
    resp_del_notif = client.delete(f"/notifications/{notif_id}", headers=fm_headers)
    assert resp_del_notif.status_code == 204
    
    # Confirm it does not return in list
    resp_list_after = client.get("/notifications", headers=so_headers)
    assert not any(n["id"] == notif_id for n in resp_list_after.json()), "Notification should be soft-deleted and hidden."

    # Soft delete document
    resp_del_doc = client.delete(f"/vehicle-documents/{doc_id}", headers=fm_headers)
    assert resp_del_doc.status_code == 200
    
    resp_doc_list = client.get("/vehicle-documents", headers=so_headers)
    assert not any(d["id"] == doc_id for d in resp_doc_list.json()["data"]), "Document should be soft-deleted."

    print("\nAll Notification & Vehicle Document integration tests passed successfully!")

if __name__ == "__main__":
    run_integration_tests()
