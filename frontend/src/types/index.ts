export type UserRole = "ADMIN" | "FLEET_MANAGER" | "DISPATCHER" | "SAFETY_OFFICER" | "FINANCIAL_ANALYST";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id?: string;
  role: {
    id: string;
    name: UserRole;
    description?: string;
  };
  phone?: string;
  profile_image?: string;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_name: string;
  vehicle_model: string;
  vehicle_type: "TRUCK" | "VAN" | "CAR" | "OTHER";
  maximum_load_capacity: number;
  odometer_reading: number;
  acquisition_cost: number;
  purchase_date: string;
  region?: string;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
  created_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  document_name: string;
  document_type: string;
  document_number?: string;
  file_name?: string;
  file_path: string;
  issue_date?: string;
  expiry_date: string;
  uploaded_by?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocumentStats {
  total_documents: number;
  expired: number;
  expiring_7_days: number;
  expiring_30_days: number;
  valid: number;
  documents_per_type: Record<string, number>;
}

export interface Driver {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_category: string;
  license_expiry: string;
  safety_score: number;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
  is_active: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  trip_number: string;
  origin: string;
  destination: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  driver_id: string;
  driver?: Driver;
  created_by_id: string;
  cargo_weight: number;
  planned_distance: number;
  actual_distance?: number;
  fuel_consumed?: number;
  revenue?: number;
  start_odometer?: number;
  end_odometer?: number;
  planned_departure: string;
  dispatch_time?: string;
  completion_time?: string;
  status: "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  remarks?: string;
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  maintenance_type: string;
  description: string;
  estimated_cost: number;
  actual_cost?: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduled_date: string;
  completion_date?: string;
  downtime?: number;
  remarks?: string;
  created_at: string;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  trip_id: string;
  trip?: Trip;
  fuel_type: string;
  station_name: string;
  fuel_quantity: number;
  price_per_liter: number;
  total_cost: number;
  odometer_reading: number;
  fuel_date: string;
  location?: string;
  notes?: string;
  created_by_id: string;
  created_at: string;
  fuel_efficiency?: number;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  trip_id?: string;
  trip?: Trip;
  expense_type: string;
  amount: number;
  expense_date: string;
  description: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: "LICENSE_EXPIRY" | "VEHICLE_DOCUMENT_EXPIRY" | "MAINTENANCE_DUE" | "MAINTENANCE_OVERDUE" | "GENERAL";
  user_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  maintenance_id?: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

export interface DashboardAlert {
  type: string;
  title: string;
  count?: number;
  value?: number;
}

export interface DashboardAlertsResponse {
  critical: DashboardAlert[];
  warning: DashboardAlert[];
  info: DashboardAlert[];
}

export interface DashboardKPIs {
  fleet: {
    total_vehicles: number;
    available: number;
    on_trip: number;
    in_shop: number;
    retired: number;
  };
  drivers: {
    total_drivers: number;
    available: number;
    on_trip: number;
    suspended: number;
    off_duty: number;
  };
  trips: {
    total_trips: number;
    draft: number;
    dispatched: number;
    completed: number;
    cancelled: number;
    active_trips: number;
    todays_trips: number;
  };
  maintenance: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  fuel: {
    total_fuel_quantity: number;
    total_fuel_cost: number;
    average_fuel_efficiency: number;
  };
  expenses: {
    total_expenses: number;
    maintenance_cost: number;
    operational_cost: number;
  };
  financial: {
    total_revenue: number;
    net_profit: number;
  };
  utilization: {
    fleet_utilization_pct: number;
    vehicle_utilization_pct: number;
    driver_utilization_pct: number;
  };
}

export interface DashboardCharts {
  monthly_trips: { month: string; trips: number }[];
  monthly_revenue: { month: string; revenue: number }[];
  monthly_expenses: { month: string; expenses: number }[];
  monthly_fuel_cost: { month: string; fuel_cost: number }[];
  maintenance_trend: { month: string; completed: number; pending: number; cancelled: number }[];
  vehicle_status_pie: { status: string; count: number }[];
  driver_status_pie: { status: string; count: number }[];
}

export interface EnhancedDashboardResponse {
  kpis: DashboardKPIs;
  charts: DashboardCharts;
  alerts: DashboardAlertsResponse;
  summary: {
    total_vehicles: number;
    total_drivers: number;
    total_trips: number;
    net_profit: number;
  };
}

export interface Pagination {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}

export interface PaginatedList<T> {
  data: T[];
  pagination: Pagination;
}
