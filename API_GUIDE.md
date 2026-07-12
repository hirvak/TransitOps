# TransitOps – API Usage & Integration Guide

This guide details authentication workflows, API endpoints, request/response models, query parameter filters, RBAC permissions, and troubleshooting tips.

---

## 🔑 Authentication Workflow

TransitOps secures all transactional endpoints using **OAuth2 Password Bearer** token schemes.

### 1. Exchange Credentials for a JWT
Submit a `POST /auth/token` request with application form parameters to log in:

**Request Parameters (Form Data)**:
- `username`: Account Email Address (e.g. `admin@transitops.com`)
- `password`: Account Password (e.g. `SecurePassword123!`)

**cURL Example**:
```bash
curl -X POST "http://127.0.0.1:8000/auth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin@transitops.com&password=SecurePassword123!"
```

**JSON Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Configure Authorization Header
For subsequent authenticated API requests, attach the token inside the HTTP `Authorization` header:

```http
Authorization: Bearer <your_access_token>
```

---

## 🛠️ Testing via Swagger Interactive Docs

FastAPI compiles self-documenting JSON schemas detailing endpoints.
1. Run the local development server: `uvicorn app.main:app --reload`
2. Open your web browser and navigate to: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
3. Click the **Authorize** lock icon at the top right.
4. Input your username and password, then click **Authorize**.
5. You can now execute routes directly from the browser sandbox.

---

## 🔍 Common Query Parameters

TransitOps implements standardized pagination, sorting, filtering, and searching parameters:

| Query Parameter | Format / Regex | Default | Description |
| :--- | :--- | :---: | :--- |
| **`page`** | Integer $\ge 1$ | `1` | Slices output records. |
| **`page_size`** | Integer $1 \dots 100$ | `10` | Maximum rows returned per page. |
| **`search`** | String | `None` | Case-insensitive multi-field search (e.g. registration numbers, names). |
| **`sort_by`** | String regex | Depends | Order database rows by a specific attribute (e.g. `created_at`, `expiry_date`). |
| **`sort_order`**| `asc` \| `desc` | `desc` | Sort order direction. |
| **`start_date`** | Date (`YYYY-MM-DD`) | `None` | Filters records starting on this date (inclusive). |
| **`end_date`** | Date (`YYYY-MM-DD`) | `None` | Filters records up to this date (inclusive). |

---

## 📋 Endpoint Summary & Permissions (RBAC Matrix)

| Module Route | Path | Method | Allowed Roles |
| :--- | :--- | :---: | :--- |
| **Auth** | `/auth/token` | `POST` | Public |
| **Users** | `/users` | `GET` \| `POST` | `ADMIN` |
| | `/users/{id}` | `PUT` \| `DELETE` | `ADMIN` |
| **Vehicles** | `/vehicles` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST` |
| | `/vehicles` | `POST` | `ADMIN`, `FLEET_MANAGER` |
| | `/vehicles/{id}` | `GET` \| `PUT` \| `DELETE` | `ADMIN`, `FLEET_MANAGER` |
| **Documents**| `/vehicle-documents` | `POST` \| `PUT` \| `DELETE`| `ADMIN`, `FLEET_MANAGER` |
| | `/vehicle-documents` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER` |
| | `/vehicle-documents/statistics` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER` |
| **Drivers** | `/drivers` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER` |
| | `/drivers` | `POST` | `ADMIN`, `FLEET_MANAGER` |
| | `/drivers/{id}` | `GET` \| `PUT` \| `DELETE` | `ADMIN`, `FLEET_MANAGER` |
| **Trips** | `/trips` | `GET` | `ADMIN`, `FLEET_MANAGER`, `DISPATCHER` |
| | `/trips` | `POST` | `ADMIN`, `FLEET_MANAGER`, `DISPATCHER` |
| | `/trips/{id}/dispatch` | `POST` | `ADMIN`, `FLEET_MANAGER`, `DISPATCHER` |
| | `/trips/{id}/complete` | `POST` | `ADMIN`, `FLEET_MANAGER`, `DISPATCHER` |
| **Maintenance**| `/maintenance` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST` |
| | `/maintenance` | `POST` \| `PUT` \| `DELETE`| `ADMIN`, `FLEET_MANAGER` |
| **Fuel** | `/fuel-logs` | `GET` \| `POST` \| `DELETE`| `ADMIN`, `FINANCIAL_ANALYST` |
| **Expenses** | `/expenses` | `GET` \| `POST` \| `DELETE`| `ADMIN`, `FINANCIAL_ANALYST` |
| **Notifications**| `/notifications` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER` |
| | `/notifications/generate` | `POST` | `ADMIN`, `FLEET_MANAGER` |
| | `/notifications/{id}/read` | `PATCH` | `ADMIN`, `FLEET_MANAGER` |
| **Dashboard**| `/dashboard` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST` |
| **Exports** | `/export/alerts/pdf` | `GET` | `ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST` |

---

## 💾 Request & Response Samples

### 1. Create Trip (`POST /trips`)
**Sample JSON Payload**:
```json
{
  "trip_number": "TRIP-2026-004",
  "origin": "Chicago Warehouse A",
  "destination": "Houston Distribution Hub",
  "vehicle_id": "a3b8cd12-77c1-4ba2-8ef9-66129ad77ea2",
  "driver_id": "d1c238b9-41fa-4cda-be01-7781a89cde99",
  "cargo_weight": 14250.0,
  "planned_distance": 1080.5,
  "planned_departure": "2026-07-15T08:00:00Z"
}
```

**JSON Response (201 Created)**:
```json
{
  "id": "e9b177c2-32b1-4d99-8ee3-492318abcf62",
  "trip_number": "TRIP-2026-004",
  "origin": "Chicago Warehouse A",
  "destination": "Houston Distribution Hub",
  "vehicle_id": "a3b8cd12-77c1-4ba2-8ef9-66129ad77ea2",
  "driver_id": "d1c238b9-41fa-4cda-be01-7781a89cde99",
  "cargo_weight": 14250.0,
  "planned_distance": 1080.5,
  "planned_departure": "2026-07-15T08:00:00Z",
  "status": "DRAFT",
  "created_by": "admin_user_uuid",
  "created_at": "2026-07-12T15:00:00Z",
  "updated_at": "2026-07-12T15:00:00Z"
}
```

### 2. Dispatch Trip (`POST /trips/{id}/dispatch`)
Dispatches a trip, logging the departure timestamp.

**JSON Response (200 OK)**:
```json
{
  "id": "e9b177c2-32b1-4d99-8ee3-492318abcf62",
  "trip_number": "TRIP-2026-004",
  "status": "DISPATCHED",
  "actual_departure": "2026-07-12T15:35:10Z"
}
```

### 3. Complete Trip (`POST /trips/{id}/complete`)
Completes a dispatched trip, updates actual distance traveled, logs cargo weight delivered, and verifies odometer increases.

**Sample JSON Payload**:
```json
{
  "actual_distance": 1090.2,
  "fuel_consumed": 380.5,
  "revenue": 3450.0,
  "end_odometer": 51090.2,
  "remarks": "On-time arrival, cargo intact."
}
```

**JSON Response (200 OK)**:
```json
{
  "id": "e9b177c2-32b1-4d99-8ee3-492318abcf62",
  "trip_number": "TRIP-2026-004",
  "status": "COMPLETED",
  "actual_distance": 1090.2,
  "fuel_consumed": 380.5,
  "revenue": 3450.0,
  "start_odometer": 50000.0,
  "end_odometer": 51090.2,
  "actual_departure": "2026-07-12T15:35:10Z",
  "actual_arrival": "2026-07-12T15:36:00Z"
}
```

### 4. Create Vehicle Document (`POST /vehicle-documents`)
**Sample JSON Payload**:
```json
{
  "vehicle_id": "a3b8cd12-77c1-4ba2-8ef9-66129ad77ea2",
  "document_name": "Commercial Vehicle Fitness Certificate",
  "document_type": "FITNESS",
  "document_number": "FIT-TRK-9008",
  "file_name": "fitness_certificate_trk101.pdf",
  "file_path": "uploads/vehicle_documents/fitness_certificate_trk101.pdf",
  "issue_date": "2026-01-01",
  "expiry_date": "2027-01-01",
  "remarks": "Valid for interstate freight transit."
}
```

---

## 🛠️ Integration Testing Checklist

Ensure the following criteria are verified prior to production releases:
- [x] **RBAC Restrictions**: Verify non-permitted accounts receive HTTP `403 Forbidden` on security endpoints.
- [x] **Workflow Gates**: Completed trips cannot be re-dispatched. Cancelled trips cannot be completed.
- [x] **Date Sanity checks**: Ensure vehicle document `issue_date` $\le$ `expiry_date` is validated.
- [x] **Uniqueness Constraint**: Prevent creating two active vehicle documents of the exact same type for a single vehicle.
- [x] **CSV BOM Markings**: Verify CSV downloads contain the prefix `\ufeff` to open in Microsoft Excel with correct encoding.
- [x] **PDF Signatures**: Verify generated PDFs begin with the characters `%PDF`.

---

## ❓ Troubleshooting

### 1. Database Connection Failures
- **Symptom**: `sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server at "localhost" failed`
- **Resolution**: Ensure the PostgreSQL service is active and running, and check that the username/password values in the `.env` file's `DATABASE_URL` string match your database settings.

### 2. Alembic Migration Conflicts
- **Symptom**: `alembic.util.exc.CommandError: Can't locate revision identified by '...'`
- **Resolution**: Reset the database migrations table or merge duplicate revisions by running `alembic merge` inside the terminal.

### 3. Permission Errors
- **Symptom**: `403 Forbidden` response returned.
- **Resolution**: Ensure the user account you authenticated with has the correct role (e.g. `ADMIN` or `FLEET_MANAGER`) inside the PostgreSQL `users` table. You can check roles by querying `SELECT name FROM roles WHERE id = role_id;`.
