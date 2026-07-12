# Software Architecture Document – TransitOps

This document details the architectural patterns, request cycles, security policies, database structures, and engineering decisions implemented inside the TransitOps backend system.

---

## 🏛️ High-Level Architecture

TransitOps follows a clean, layered architectural pattern that separates presentation, business operations, data queries, and storage layers:

```mermaid
graph TD
    Client[Client Browser / Swagger / UI]
    FastAPI[Presentation Layer: FastAPI Controllers / Routers]
    Security[Security Layer: JWT Authentication & RBAC Checks]
    Services[Business Logic Layer: Services]
    Repositories[Data Access Layer: Repositories]
    Postgres[(PostgreSQL Database)]

    Client <--> FastAPI
    FastAPI <--> Security
    Security <--> Services
    Services <--> Repositories
    Repositories <--> Postgres
```

### Module Flow & Middleware
All requests from the presentation layer validate authorization credentials prior to reaching the domain business processes:

```mermaid
graph LR
    Auth[Auth / JWT Token Verification] --> RBAC{RBAC Verification}
    RBAC -->|Admin / FM| VehicleMod[Vehicles & Documents]
    RBAC -->|Admin / Dispatcher| TripMod[Trip Dispatching]
    RBAC -->|Admin / FA| FinanceMod[Fuel & Expenses]
    RBAC -->|Admin / SO / FA / FM| AnalyticsMod[Analytics & Dashboard]
```

---

## 🔁 Request Cycle & Data Flow

Every standard CRUD or query request goes through a sequential lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as API Controller (FastAPI)
    participant Perm as Permission Dependency
    participant Service as Business Service
    participant Repo as Repository (SQLAlchemy)
    participant DB as PostgreSQL DB

    Client->>API: Request (HTTP verb + payload)
    API->>Perm: Check JWT and Role name
    alt Role Denied
        Perm-->>Client: 403 Forbidden
    else Role Allowed
        Perm->>API: User Context
        API->>Service: Call service method with Payload
        Service->>Service: Validate business rules (e.g. date overlap)
        Service->>Repo: Request Database Transaction
        Repo->>DB: SQL Execution (select/insert/update)
        DB-->>Repo: Row data
        Repo-->>Service: ORM entity
        Service->>Service: Map to Pydantic Schema
        Service-->>API: Schema response instance
        API-->>Client: 200 OK / 201 Created (JSON Response)
    end
```

---

## 📁 Project Structure & Responsibilities

The codebase organizes files inside domain-specific directories to minimize tight coupling:

| Directory | Responsibility | Architectural Layer |
| :--- | :--- | :--- |
| **`app/Auth/`** | Token verification, login validations, and payload parsing. | Presentation / Security |
| **`app/Users/`** | Stores `User` model, CRUD handlers, and registration schemas. | Domain Module |
| **`app/Vehicles/`** | Handles `Vehicle` registration, updates, and `VehicleDocument` CRUD. | Domain Module |
| **`app/Drivers/`** | Details about drivers, licenses, categories, and safety indices. | Domain Module |
| **`app/Trips/`** | Contains state checks, dispatch rules, odometer logs, and arrival times. | Domain Module |
| **`app/Maintenance/`** | Manages maintenance logs, status changes, and downtime estimates. | Domain Module |
| **`app/FuelExpense/`** | Audits fuel consumption quantities, costs, and parking/repair fees. | Domain Module |
| **`app/Notifications/`**| Scans for expiring licenses/documents and creates reminder logs. | Domain Module |
| **`app/Analytics/`** | Computes KPI ratios, reports, monthly charts, and CSV/PDF exporters. | Application Services |
| **`app/Security/`** | Password hashing functions and RBAC dependency decorators. | Cross-Cutting Security |
| **`app/Database/`** | Context engine setup, transaction session generators, and migrations base. | Database Layer |
| **`app/Utils/`** | Application settings, constants, and custom config mappings. | Utilities |

---

## 🗄️ Database Schema & Relationships (ERD)

The relational schema ensures data integrity and supports complex reporting aggregations:

```mermaid
erDiagram
    Role {
        uuid id PK
        string name
        string description
    }
    User {
        uuid id PK
        uuid role_id FK
        string email
        string hashed_password
        string full_name
        boolean is_deleted
    }
    Vehicle {
        uuid id PK
        string registration_number
        string vehicle_name
        string status
        boolean is_deleted
    }
    VehicleDocument {
        uuid id PK
        uuid vehicle_id FK
        uuid uploaded_by FK
        string document_type
        string document_number
        date issue_date
        date expiry_date
        boolean is_deleted
    }
    Driver {
        uuid id PK
        string full_name
        date license_expiry
        string status
        boolean is_deleted
    }
    Trip {
        uuid id PK
        string trip_number
        uuid vehicle_id FK
        uuid driver_id FK
        uuid created_by_id FK
        float actual_distance
        float revenue
        datetime completion_time
        string status
        boolean is_deleted
    }
    MaintenanceLog {
        uuid id PK
        uuid vehicle_id FK
        string status
        float estimated_cost
        float actual_cost
        date scheduled_date
        boolean is_deleted
    }
    FuelLog {
        uuid id PK
        uuid vehicle_id FK
        uuid trip_id FK
        float fuel_quantity
        float total_cost
        boolean is_deleted
    }
    Expense {
        uuid id PK
        uuid vehicle_id FK
        uuid trip_id FK
        float amount
        string expense_type
        boolean is_deleted
    }
    Notification {
        uuid id PK
        string title
        string notification_type
        uuid user_id FK
        uuid vehicle_id FK
        uuid driver_id FK
        uuid maintenance_id FK
        boolean is_read
        boolean is_deleted
    }

    User }o--|| Role : belongs_to
    VehicleDocument }o--|| Vehicle : belongs_to
    VehicleDocument }o--|| User : uploaded_by
    Trip }o--|| Vehicle : assigned_vehicle
    Trip }o--|| Driver : assigned_driver
    Trip }o--|| User : created_by
    MaintenanceLog }o--|| Vehicle : targets_vehicle
    FuelLog }o--|| Vehicle : logs_fuel_for
    FuelLog }o--|| Trip : related_to
    Expense }o--|| Vehicle : charged_to
    Expense }o--|| Trip : related_to
    Notification }o--|| User : notifies
    Notification }o--|| Vehicle : alerts_vehicle
    Notification }o--|| Driver : alerts_driver
    Notification }o--|| MaintenanceLog : alerts_maintenance
```

---

## 🔒 Security Architecture (RBAC Flow)

TransitOps enforces role-based access validation using reusable FastAPI dependencies:

```mermaid
graph TD
    Request[HTTP Request] --> CheckJWT{JWT Token Present?}
    CheckJWT -->|No| R401[401 Unauthorized]
    CheckJWT -->|Yes| Decode[Decode Token payload]
    Decode --> FetchUser[Get Active User from DB]
    FetchUser --> RequireRole{Role matches Allowed list?}
    RequireRole -->|No| R403[403 Forbidden]
    RequireRole -->|Yes| Exec[Execute Business logic in API Endpoint]
```

---

## 📊 Analytics Aggregation Architecture

The Analytics Module aggregates data directly from multiple entities to compute KPI summaries:

```mermaid
graph TD
    Trips[(Trips Table)] -->|Distance & Revenue| AggRepo[Repository SQL Aggregations]
    Fuel[(FuelLogs Table)] -->|Liters & Total Cost| AggRepo
    Maintenance[(Maintenance Table)] -->|Actual & Estimated Cost| AggRepo
    Expenses[(Expenses Table)] -->|Other Operational Costs| AggRepo

    AggRepo -->|Raw Numbers| AggService[Service Layer Formulas]
    AggService -->|Calculation Metrics| Profit[Net Profit & Margins]
    AggService -->|Calculation Metrics| Util[Fleet Utilization %]
    AggService -->|Calculation Metrics| Eff[Fuel Efficiency km/L]

    Profit & Util & Eff -->|JSON Output| Dashboard[Unified Dashboard API]
    Profit & Util & Eff -->|Streamed Output| Exporters[CSV & ReportLab PDF Exporters]
```

---

## 🔔 Notifications & Alerts Workflow

Notifications are created by a centralized scan function that checks for expiry limits:

```mermaid
graph TD
    Drivers[(Driver Table)] -->|License Expiry <= 30, 15, 7, 0 days| Scanner[generate_notifications Service]
    Docs[(Vehicle Documents)] -->|Document Expiry <= 30, 15, 7, 0 days| Scanner
    Maint[(Maintenance Table)] -->|Overdue scheduled < today & incomplete| Scanner

    Scanner --> CheckDup{Alert already exists?}
    CheckDup -->|No| WriteDB[Insert Notification in DB]
    CheckDup -->|Yes| Skip[Skip Alert creation]

    WriteDB --> DashAlerts[GET /dashboard/alerts critical/warning metrics]
```

---

## 🧱 Design & Architecture Principles

- **Repository Pattern**: All database querying is isolated inside class repositories (e.g. `VehicleRepository`). Services never construct direct SQL statements, keeping the data layer decoupled.
- **Service Layer**: Business rule validations, calculations, and error checks reside inside domain service classes (e.g. `TripService`), ensuring clean controllers.
- **Soft Delete Pattern**: Entities inherit `is_deleted` attributes. Data is marked `is_deleted = True` instead of being physically purged, protecting database referential integrity.
- **Transaction Safety**: All create, modify, and delete transactions run inside standard rollback guards. Database operations execute `db.flush()` and only `commit()` at the final execution step.
- **Error Handlers**:
  - `400 Bad Request`: Validation issues (e.g. dispatching a completed trip).
  - `403 Forbidden`: RBAC role permission blockings.
  - `404 Not Found`: Missing resource identifiers.
  - `422 Unprocessable Entity`: Request body parser mismatches.
  - `500 Internal Server Error`: Unexpected runtime anomalies.
- **Performance Optimizations**:
  - **Pagination**: Limits dataset fetches using SQL page slicing.
  - **Indexes**: Applied to foreign keys and lookup queries (e.g. `vehicle_id`, `driver_id`, `is_read`).
  - **Aggregations**: Summarizes financial math and fuel efficiency ratios directly in Postgres using SQL `func.sum` and `func.count` queries.

---

## 🌐 Deployment Architecture

TransitOps can be deployed inside containerized network layers:

```mermaid
graph LR
    Browser[Client Web browser / App]
    ReverseProxy[Nginx / Cloudflare SSL Reverse Proxy]
    FastAPI[FastAPI Backend Engine: Gunicorn + Uvicorn workers]
    Postgres[(PostgreSQL Relational DB Node)]

    Browser <-->|HTTPS Port 443| ReverseProxy
    ReverseProxy <-->|HTTP Port 8000| FastAPI
    FastAPI <-->|SQL Port 5432| Postgres
```
