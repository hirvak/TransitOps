import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Calendar, 
  Search, 
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  Wrench,
  Gauge,
  Loader2
} from "lucide-react";

import { reportsApi } from "../api/reports";
import { apiClient } from "../utils/apiClient";
import { DataTable, ColumnDef } from "../components/DataTable";
import { Pagination } from "../components/Pagination";

type ReportTab = "vehicles" | "drivers" | "trips" | "maintenance" | "fuel" | "expenses" | "financial";

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("vehicles");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  // Queries
  const { data: vehiclesData, isLoading: isVehiclesLoading, isError: isVehiclesError } = useQuery({
    queryKey: ["reportVehicles", page, search, startDate, endDate],
    queryFn: () => reportsApi.getVehiclesReport({
      page,
      page_size: 10,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "vehicles"
  });

  const { data: driversData, isLoading: isDriversLoading, isError: isDriversError } = useQuery({
    queryKey: ["reportDrivers", page, search, startDate, endDate],
    queryFn: () => reportsApi.getDriversReport({
      page,
      page_size: 10,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "drivers"
  });

  const { data: tripsData, isLoading: isTripsLoading, isError: isTripsError } = useQuery({
    queryKey: ["reportTrips", page, search, startDate, endDate],
    queryFn: () => reportsApi.getTripsReport({
      page,
      page_size: 10,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "trips"
  });

  const { data: maintData, isLoading: isMaintLoading, isError: isMaintError } = useQuery({
    queryKey: ["reportMaint", page, search, startDate, endDate],
    queryFn: () => reportsApi.getMaintenanceReport({
      page,
      page_size: 10,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "maintenance"
  });

  const { data: fuelData, isLoading: isFuelLoading, isError: isFuelError } = useQuery({
    queryKey: ["reportFuel", page, search, startDate, endDate],
    queryFn: () => reportsApi.getFuelReport({
      page,
      page_size: 10,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "fuel"
  });

  const { data: expensesData, isLoading: isExpensesLoading, isError: isExpensesError } = useQuery({
    queryKey: ["reportExpenses", page, search, startDate, endDate],
    queryFn: () => reportsApi.getExpensesReport({
      page,
      page_size: 10,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "expenses"
  });

  const { data: financialData, isLoading: isFinancialLoading, isError: isFinancialError } = useQuery({
    queryKey: ["reportFinancial", startDate, endDate],
    queryFn: () => reportsApi.getFinancialReport({
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    enabled: activeTab === "financial"
  });

  // Token-authenticated File Downloader
  const handleExportDownload = async (url: string, extension: "csv" | "pdf", defaultName: string) => {
    try {
      setExporting(true);
      toast.info(`Preparing ${extension.toUpperCase()} report file export...`);

      const params: any = {};
      if (search) params.search = search;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await apiClient.get(url, {
        params,
        responseType: "blob"
      });

      const mimeTypes = {
        csv: "text/csv;charset=utf-8;",
        pdf: "application/pdf"
      };

      const blob = new Blob([response.data], { type: mimeTypes[extension] });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `${defaultName}_${new Date().toISOString().split("T")[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`${extension.toUpperCase()} export completed successfully.`);
    } catch (err: any) {
      toast.error("Failed to export report. Confirm backend permissions.");
    } finally {
      setExporting(false);
    }
  };

  // Columns Definitions
  const vehicleColumns: ColumnDef<any>[] = [
    { header: "Reg Number", cell: (row) => <span className="font-mono text-xs font-semibold">{row.registration_number}</span> },
    { header: "Name", cell: (row) => <span className="text-xs">{row.vehicle_name}</span> },
    { header: "Trips Completed", cell: (row) => <span className="text-xs">{row.trips_completed}</span> },
    { header: "Distance Covered", cell: (row) => <span className="text-xs">{row.distance.toLocaleString()} km</span> },
    { header: "Fuel Costs", cell: (row) => <span className="text-xs">${row.fuel_cost.toLocaleString()}</span> },
    { header: "Maint Costs", cell: (row) => <span className="text-xs">${row.maintenance_cost.toLocaleString()}</span> },
    { header: "Expenses", cell: (row) => <span className="text-xs">${row.expense_cost.toLocaleString()}</span> },
    { header: "Total Operating Cost", cell: (row) => <span className="text-xs font-semibold">${row.total_cost.toLocaleString()}</span> },
    { header: "Revenue", cell: (row) => <span className="text-xs text-blue-600 font-medium">${row.revenue.toLocaleString()}</span> },
    { header: "Margin/Profit", cell: (row) => <span className={`text-xs font-bold ${row.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>${row.profit.toLocaleString()}</span> }
  ];

  const driverColumns: ColumnDef<any>[] = [
    { header: "Driver Name", cell: (row) => <span className="text-xs font-semibold">{row.full_name}</span> },
    { header: "Trips Executed", cell: (row) => <span className="text-xs">{row.trips_completed}</span> },
    { header: "Distance covered", cell: (row) => <span className="text-xs">{row.distance.toLocaleString()} km</span> },
    { header: "Revenue Generated", cell: (row) => <span className="text-xs font-semibold text-emerald-600">${row.revenue_generated.toLocaleString()}</span> },
    { header: "Fuel Quantity Filled", cell: (row) => <span className="text-xs">{row.fuel_used.toLocaleString()} L</span> },
    { header: "Avg Route Distance", cell: (row) => <span className="text-xs">{row.average_trip_distance.toFixed(1)} km</span> },
    { header: "Avg Route Duration", cell: (row) => <span className="text-xs">{row.average_trip_duration.toFixed(1)} hrs</span> },
    { header: "Status", cell: (row) => <span className="text-xs capitalize font-medium">{row.current_status.toLowerCase()}</span> }
  ];

  const tripColumns: ColumnDef<any>[] = [
    { header: "Trip Number", cell: (row) => <span className="font-mono text-xs font-semibold">{row.trip_number}</span> },
    { header: "Vehicle Reg", cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.vehicle_registration}</span> },
    { header: "Driver Name", cell: (row) => <span className="text-xs">{row.driver_name}</span> },
    { header: "Origin", cell: (row) => <span className="text-xs">{row.origin}</span> },
    { header: "Destination", cell: (row) => <span className="text-xs">{row.destination}</span> },
    { header: "Distance", cell: (row) => <span className="text-xs">{row.distance.toLocaleString()} km</span> },
    { header: "Revenue", cell: (row) => <span className="text-xs font-semibold text-emerald-600">${row.revenue.toLocaleString()}</span> },
    { header: "Fuel Logs (L)", cell: (row) => <span className="text-xs">{row.fuel.toLocaleString()} L</span> },
    { header: "Status", cell: (row) => <span className="text-xs uppercase font-medium">{row.status}</span> },
    { header: "Duration", cell: (row) => <span className="text-xs">{row.duration.toFixed(1)} hrs</span> }
  ];

  const maintColumns: ColumnDef<any>[] = [
    { header: "Vehicle Reg", cell: (row) => <span className="font-mono text-xs font-semibold">{row.vehicle_registration}</span> },
    { header: "Service Type", cell: (row) => <span className="text-xs">{row.maintenance_type}</span> },
    { header: "Job Status", cell: (row) => <span className="text-xs font-medium uppercase">{row.status}</span> },
    { header: "Est Cost", cell: (row) => <span className="text-xs">${row.estimated_cost.toLocaleString()}</span> },
    { header: "Act Cost", cell: (row) => <span className="text-xs">{row.actual_cost ? `$${row.actual_cost.toLocaleString()}` : "—"}</span> },
    { header: "Scheduled Date", cell: (row) => <span className="text-xs">{new Date(row.scheduled_date).toLocaleDateString()}</span> },
    { header: "Completion Date", cell: (row) => <span className="text-xs">{row.completion_date ? new Date(row.completion_date).toLocaleDateString() : "—"}</span> },
    { header: "Downtime", cell: (row) => <span className="text-xs font-semibold text-rose-600">{row.downtime} days</span> }
  ];

  const fuelColumns: ColumnDef<any>[] = [
    { header: "Vehicle", cell: (row) => <span className="font-mono text-xs font-semibold">{row.vehicle_registration}</span> },
    { header: "Trip No", cell: (row) => <span className="font-mono text-xs text-primary-600">{row.trip_number}</span> },
    { header: "Quantity", cell: (row) => <span className="text-xs">{row.fuel_quantity.toLocaleString()} L</span> },
    { header: "Fuel Cost", cell: (row) => <span className="text-xs font-semibold">${row.fuel_cost.toLocaleString()}</span> },
    { header: "Mileage", cell: (row) => <span className="text-xs text-emerald-600 font-medium">{row.fuel_efficiency ? `${row.fuel_efficiency.toFixed(2)} km/L` : "—"}</span> },
    { header: "Station Name", cell: (row) => <span className="text-xs">{row.station}</span> },
    { header: "Fuel Type", cell: (row) => <span className="text-xs uppercase">{row.fuel_type}</span> }
  ];

  const expenseColumns: ColumnDef<any>[] = [
    { header: "Vehicle Reg", cell: (row) => <span className="font-mono text-xs font-semibold">{row.vehicle_registration}</span> },
    { header: "Expense Category", cell: (row) => <span className="text-xs uppercase font-medium">{row.expense_type}</span> },
    { header: "Amount", cell: (row) => <span className="text-xs font-semibold">${row.amount.toLocaleString()}</span> },
    { header: "Ledger Date", cell: (row) => <span className="text-xs">{new Date(row.expense_date).toLocaleDateString()}</span> },
    { header: "Description", cell: (row) => <span className="text-xs text-muted-foreground">{row.description}</span> }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & Export Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate and export consolidated operation statements, downtime audits, and financial summaries.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab !== "financial" && (
            <button
              onClick={() => handleExportDownload(`/export/${activeTab}/csv`, "csv", `${activeTab}_report`)}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg hover:bg-muted text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={() => handleExportDownload(`/export/${activeTab}/pdf`, "pdf", `${activeTab}_report`)}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b overflow-x-auto max-w-full">
        {(["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "financial"] as ReportTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} Report
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        {activeTab !== "financial" && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search registration, identifier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none"
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border rounded-lg bg-background text-xs focus:outline-none"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border rounded-lg bg-background text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="space-y-4">
        
        {/* VEHICLES REPORT */}
        {activeTab === "vehicles" && (
          <>
            {isVehiclesError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error fetching vehicle logs.</div>}
            {!isVehiclesError && (
              <DataTable
                columns={vehicleColumns}
                data={vehiclesData?.data || []}
                loading={isVehiclesLoading}
                emptyTitle="No vehicle report compiled"
                emptyDescription="Check dates filters values to audit fleet parameters."
              />
            )}
            {vehiclesData?.pagination && vehiclesData.pagination.total_pages > 1 && (
              <Pagination pagination={vehiclesData.pagination} onPageChange={setPage} />
            )}
          </>
        )}

        {/* DRIVERS REPORT */}
        {activeTab === "drivers" && (
          <>
            {isDriversError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error fetching driver logs.</div>}
            {!isDriversError && (
              <DataTable
                columns={driverColumns}
                data={driversData?.data || []}
                loading={isDriversLoading}
                emptyTitle="No driver report compiled"
                emptyDescription="Check date ranges filters to view performance metrics."
              />
            )}
            {driversData?.pagination && driversData.pagination.total_pages > 1 && (
              <Pagination pagination={driversData.pagination} onPageChange={setPage} />
            )}
          </>
        )}

        {/* TRIPS REPORT */}
        {activeTab === "trips" && (
          <>
            {isTripsError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error fetching trips report.</div>}
            {!isTripsError && (
              <DataTable
                columns={tripColumns}
                data={tripsData?.data || []}
                loading={isTripsLoading}
                emptyTitle="No trips report compiled"
              />
            )}
            {tripsData?.pagination && tripsData.pagination.total_pages > 1 && (
              <Pagination pagination={tripsData.pagination} onPageChange={setPage} />
            )}
          </>
        )}

        {/* MAINTENANCE REPORT */}
        {activeTab === "maintenance" && (
          <>
            {isMaintError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error fetching maintenance logs.</div>}
            {!isMaintError && (
              <DataTable
                columns={maintColumns}
                data={maintData?.data || []}
                loading={isMaintLoading}
                emptyTitle="No maintenance report compiled"
              />
            )}
            {maintData?.pagination && maintData.pagination.total_pages > 1 && (
              <Pagination pagination={maintData.pagination} onPageChange={setPage} />
            )}
          </>
        )}

        {/* FUEL REPORT */}
        {activeTab === "fuel" && (
          <>
            {isFuelError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error auditing fuel logs.</div>}
            {!isFuelError && (
              <DataTable
                columns={fuelColumns}
                data={fuelData?.data || []}
                loading={isFuelLoading}
                emptyTitle="No fuel audit compiled"
              />
            )}
            {fuelData?.pagination && fuelData.pagination.total_pages > 1 && (
              <Pagination pagination={fuelData.pagination} onPageChange={setPage} />
            )}
          </>
        )}

        {/* EXPENSES REPORT */}
        {activeTab === "expenses" && (
          <>
            {isExpensesError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error fetching expenses report.</div>}
            {!isExpensesError && (
              <DataTable
                columns={expenseColumns}
                data={expensesData?.data || []}
                loading={isExpensesLoading}
                emptyTitle="No expenses compiled"
              />
            )}
            {expensesData?.pagination && expensesData.pagination.total_pages > 1 && (
              <Pagination pagination={expensesData.pagination} onPageChange={setPage} />
            )}
          </>
        )}

        {/* SYSTEM-WIDE FINANCIALS REPORT */}
        {activeTab === "financial" && (
          <>
            {isFinancialError && <div className="p-4 border border-rose-200 text-rose-600 rounded-xl bg-rose-50/50">Error fetching financial reports.</div>}
            {!isFinancialError && financialData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                
                {/* Margins */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 border-b pb-3 mb-2">
                    <DollarSign className="w-5 h-5" />
                    <h3 className="font-bold text-sm tracking-wide uppercase">Operational Margins</h3>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Total Revenue:</span>
                      <span className="font-bold text-foreground">${financialData.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Operational Spend:</span>
                      <span className="font-semibold text-rose-600">${financialData.operational_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/10 p-2.5 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold">
                      <span>Net Profit Margin:</span>
                      <span>${financialData.net_profit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-1 font-semibold">
                      <span className="text-muted-foreground text-xs">Margin Ratio (%):</span>
                      <span className="text-sm">{financialData.profit_margin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Spending allocation */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 border-b pb-3 mb-2">
                    <Layers className="w-5 h-5" />
                    <h3 className="font-bold text-sm tracking-wide uppercase">Operating Spend</h3>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Fuel Refills Cost:</span>
                      <span className="font-semibold text-foreground">${financialData.fuel_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Maintenance checkups:</span>
                      <span className="font-semibold text-foreground">${financialData.maintenance_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Incidentals & Tolls:</span>
                      <span className="font-semibold text-foreground">${financialData.expenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Performance efficiency KPIs */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-violet-600 border-b pb-3 mb-2">
                    <Gauge className="w-5 h-5" />
                    <h3 className="font-bold text-sm tracking-wide uppercase">Efficiency Indexes</h3>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Cost per kilometer:</span>
                      <span className="font-bold text-foreground">
                        {financialData.cost_per_km ? `$${financialData.cost_per_km.toFixed(2)}/km` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Revenue per kilometer:</span>
                      <span className="font-bold text-foreground">
                        {financialData.revenue_per_km ? `$${financialData.revenue_per_km.toFixed(2)}/km` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1 text-xs text-muted-foreground leading-relaxed mt-2">
                      <span>Calculated globally across all completed route runs.</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
};
