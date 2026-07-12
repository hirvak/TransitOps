# TransitOps – Fleet Management System

TransitOps is a production-ready, high-performance backend system built with **FastAPI** designed to handle transport operations, logistics tracking, fuel analytics, vehicle maintenance cycles, expense audits, dashboard metrics, alerts, and PDF/CSV data exports.

It features standard security protocols, fine-grained **Role-Based Access Control (RBAC)**, pagination, soft deletion, SQLAlchemy 2.0 async-compatible design patterns, and comprehensive integration test coverage.

---

## 🚀 Features

### 🔐 Authentication & Security
- **JWT Authentication**: OAuth2 compatible flow with secure access/refresh token pairs.
- **Role-Based Access Control (RBAC)**: Custom dependencies checking permission access for distinct administrative, operational, safety, and financial roles.
- **User Management**: Creating, updating, listing, and soft-deleting user profiles.

### 🚛 Fleet Management
- **Vehicle Management**: Detailed registrations, tracking statuses (`AVAILABLE`, `ON_TRIP`, `IN_SHOP`, `RETIRED`), region, and odometer tracking.
- **Driver Management**: Profile entries, phone/license configurations, safety score evaluations, and status tracking.
- **Vehicle Documents**: Complete CRUD operations, statistics (`total`, `expired`, `valid`, `expiring 7/30 days`), type classifications (`RC`, `INSURANCE`, `PUC`, `FITNESS`, `PERMIT`, `ROAD_TAX`, `OTHER`), and date sanity checks.

### 📦 Operations
- **Trip Management**: Route logistics tracking with status safeguards. Completed trips cannot be dispatched again; cancelled trips cannot be completed. Exposes analytics fields (`actual_departure`, `actual_arrival`, `created_by`).
- **Maintenance Management**: Tracks preventative maintenance (PM), repair logs, scheduled date ranges, downtime tracking, and estimated vs. actual expenses.
- **Fuel Logs**: Tracks station name, quantities (L), price per liter, total costs, and link-validated trip associations to compute fuel efficiency.
- **Expenses**: Tracks tolls, parking, repair, insurance, fines, maintenance, and miscellaneous costs.

### 📊 Analytics & Reporting
- **Dashboard KPIs**: Real-time fleet utilization percentage, average trip duration, and total cargo weights.
- **Charts Widgets Data**: Summarizes monthly trip volume, financial trends, fuel costs, and driver/vehicle status counts.
- **Dashboard Alerts**: Calculates critical alerts (license expiry, overdue maintenance), warnings (expiring documents), and info counters.
- **Financial Reports**: Aggregates total revenue, operational costs, net profit, profit margins, cost per KM, and revenue per KM.
- **Data Export**: Streamed UTF-8 BOM CSV files and customized ReportLab-designed PDF documents with company header and user signature.

### ⚙️ Common Features
- **Pagination**: Consistent pagination structure (`total_records`, `total_pages`, `current_page`, `page_size`).
- **Search & Filters**: Multi-field SQL search and category filters across all lists.
- **Soft Delete**: Safeguards records using `is_deleted` flags to prevent reference constraint breaks.
- **Swagger Documentation**: Self-documenting JSON schemas, examples, and routes.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Language** | Python 3.10+ | Core scripting language. |
| **Framework** | FastAPI | High-performance asynchronous API framework. |
| **ORM** | SQLAlchemy 2.0 | Advanced SQL Object Relational Mapper. |
| **Migration** | Alembic | Database schema version control. |
| **Database** | PostgreSQL | Robust production-grade relational database. |
| **Validation** | Pydantic v2 | Schema definitions and query parameters parser. |
| **Security** | Passlib (bcrypt) / PyJWT | Password hashing and JWT generation. |
| **Logging** | Loguru | Centralized logger for audit trails. |
| **PDF Engine** | ReportLab | Streamed binary PDF generation with tabular structures. |

---

## 📁 Folder Structure

```
app/
├── Analytics/            # KPI calculations, report aggregation services, CSV/PDF exporters
│   ├── api.py
│   ├── repository.py
│   ├── services.py
│   └── schemas.py
├── Auth/                 # JWT workflows, password verification, token exchange
├── Database/             # Database connection setup, Base model definitions
├── Drivers/              # Driver details, licensing information
├── FuelExpense/          # Fuel logs, transaction management, other expenses
├── Maintenance/          # Vehicle checkups, PM scheduling, downtime trackers
├── Notifications/        # System notification scans and read/unread updates
├── Security/             # Passwords hashing, permission role dependencies
├── Trips/                # Trip routing logs and status workflows
├── Users/                # User accounts configuration
├── Vehicles/             # Vehicle parameters and document management
├── Utils/                # Configuration settings, constants
├── Scripts/              # Seeding roles and automated integration test suites
└── main.py               # Main application routing configuration
```

---

## 💻 Installation & Database Setup

### 1. Clone & Setup Environment
```bash
git clone https://github.com/your-username/TransitOps.git
cd TransitOps

# Create a virtual environment
python -m venv venv
# Activate virtual environment (Windows)
.\venv\Scripts\activate
# Activate virtual environment (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration (`.env`)
Create a `.env` file in the root directory based on the `.env.example`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transitops
JWT_SECRET=your_super_secret_jwt_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 3. Migrations & Seeding
```bash
# Apply database schemas
alembic upgrade head

# Seed required role definitions (ADMIN, FLEET_MANAGER, etc.)
python -m app.Scripts.seed_roles
```

### 4. Run the API Server
```bash
uvicorn app.main:app --reload
```
Once started, you can access the interactive Swagger API docs at:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

---

## 🧩 Modules Status

| Module | Status |
| :--- | :--- |
| **Authentication** | [✔️] Completed / Production-Ready |
| **Users** | [✔️] Completed / Production-Ready |
| **Vehicles** | [✔️] Completed / Production-Ready |
| **Drivers** | [✔️] Completed / Production-Ready |
| **Trips** | [✔️] Completed / Production-Ready |
| **Maintenance** | [✔️] Completed / Production-Ready |
| **Fuel & Expense** | [✔️] Completed / Production-Ready |
| **Notifications** | [✔️] Completed / Production-Ready |
| **Analytics** | [✔️] Completed / Production-Ready |
| **Reports** | [✔️] Completed / Production-Ready |
| **Dashboard** | [✔️] Completed / Production-Ready |
| **Exports** | [✔️] Completed / Production-Ready |
| **Vehicle Documents**| [✔️] Completed / Production-Ready |

---

## 👥 Roles & Permissions Matrix

The backend enforces strict access control rules checking permissions for each role:

| Endpoint Module | ADMIN | FLEET_MANAGER | DISPATCHER | SAFETY_OFFICER | FINANCIAL_ANALYST |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Authentication** | Full Access | Full Access | Full Access | Full Access | Full Access |
| **Users CRUD** | Full Access | No Access | No Access | No Access | No Access |
| **Vehicles CRUD** | Full Access | Full Access | No Access | No Access | No Access |
| **Drivers CRUD** | Full Access | Full Access | No Access | No Access | No Access |
| **Trips Dispatch** | Full Access | Full Access | Full Access | No Access | No Access |
| **Maintenance Write**| Full Access | Full Access | No Access | No Access | No Access |
| **Fuel & Expense** | Full Access | No Access | No Access | No Access | Full Access |
| **Notifications** | Full Access | Full Access | No Access | Read Only | No Access |
| **Analytics/Reports**| Full Access | Full Access | No Access | Full Access | Full Access |
| **Export Formats** | Full Access | Full Access | No Access | Full Access | Full Access |

---

## 🌐 API Overview

- **`/auth`**: Token generation (`POST /auth/token`) and refresh routes.
- **`/users`**: Standard user CRUD operations.
- **`/vehicles`**: Vehicle information, location, odometer details.
- **`/vehicle-documents`**: Expanded CRUD operations, validation checks, and statistics.
- **`/drivers`**: Driver details, licenses, safety scores.
- **`/trips`**: Routing parameters, statuses (`DRAFT`, `DISPATCHED`, `COMPLETED`, `CANCELLED`), dispatch logs, and analytics.
- **`/maintenance`**: Repair log creations, PM scheduling, and downtime trackers.
- **`/fuel-logs` & `/expenses`**: Financial transaction entries.
- **`/notifications`**: Triggers scanner, lists unread logs, and manages reads.
- **`/dashboard`**: Merged dashboard parameters (KPIs, Charts, Alerts, Summary).
- **`/reports`**: Tabular logs for vehicles, drivers, maintenance, and financials.
- **`/export`**: Exports dashboard summary, reports, and alert logs as PDF or CSV.

---

## 🔗 Database Relationships Diagram

```
       ┌───────────┐
       │   User    │──────┐
       └───────────┘      │
             │            │ (creates)
             │            ▼
             │      ┌───────────┐
             │      │   Trip    │──────┐
             │      └───────────┘      │
             │            ▲            │
             │ (uploaded) │ (assigned) │ (tracks fuel/cost)
             ▼            │            ▼
     ┌──────────────┐     │     ┌─────────────┐
     │  Doc/Notif   │     ├─────│   FuelLog   │
     └──────────────┘     │     └─────────────┘
             ▲            │            │
             │ (belongs)  │ (belongs)  │ (aggregates)
             ▼            ▼            ▼
       ┌───────────┐      │     ┌─────────────┐
       │  Vehicle  │◄─────┼─────│  Analytics  │
       └───────────┘      │     └─────────────┘
             ▲            │            ▲
             │ (belongs)  │            │ (aggregates)
             ▼            │            │
       ┌───────────┐      │            │
       │Maintenance│◄─────┼────────────┘
       └───────────┘      │
                          ▼
                    ┌───────────┐
                    │  Driver   │
                    └───────────┘
```

---

## 🖼️ UI Screenshots Placeholders
*Place real UI layout captures here when coupling this API engine with the frontend framework:*
- **Swagger Documentation**: `/docs` path showing structured parameters and JSON models.
- **Dashboard**: Unified KPI card widgets showing Fleet Utilization, Active Trips, and Net Profit.
- **Analytics Charts**: Monthly cost trends line charts and vehicle status pie ratios.

---

## 🔮 Future Improvements
1. **Email Integration**: Link real SMTP providers or SendGrid to email alerts automatically when notifications generate.
2. **Scheduled Cron Jobs**: Configure Celery Beat or APscheduler to execute `/notifications/generate` every night.
3. **Frontend Application**: Add a web dashboard using Next.js/React.
4. **Mobile Application**: Build a driver-centric mobile app using Flutter to update trip milestones and upload fuel receipt photos.
5. **Dockerization**: Containerize app with Docker Compose (PostgreSQL, FastAPI, Redis).
6. **Caching**: Integrate Redis cache on heavy report endpoints.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
