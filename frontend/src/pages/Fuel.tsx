import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X,
  Loader2,
  AlertTriangle,
  Fuel,
  TrendingUp,
  DollarSign,
  Gauge,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";

import { fuelApi } from "../api/fuel";
import { vehiclesApi } from "../api/vehicles";
import { tripsApi } from "../api/trips";
import { expensesApi } from "../api/expenses";
import { DataTable, ColumnDef } from "../components/DataTable";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatsCard } from "../components/StatsCard";
import { FuelLog } from "../types";

// Validation schema for creating/updating a fuel log
const fuelLogSchema = zod.object({
  vehicle_id: zod.string().min(1, "Please select a vehicle."),
  trip_id: zod.string().min(1, "Please select an associated trip route."),
  fuel_type: zod.enum(["DIESEL", "PETROL", "CNG", "ELECTRIC", "OTHER"]),
  station_name: zod.string().min(1, "Station name cannot be empty."),
  location: zod.string().optional().or(zod.literal("")),
  fuel_quantity: zod.number().positive("Quantity in liters must be greater than zero."),
  price_per_liter: zod.number().positive("Price per liter must be greater than zero."),
  odometer_reading: zod.number().min(0, "Odometer reading must be non-negative."),
  fuel_date: zod.string().min(10, "Please enter a valid fuel date (YYYY-MM-DD).")
    .refine((val) => new Date(val) <= new Date(), {
      message: "Fuel date cannot be in the future."
    }),
  notes: zod.string().optional().or(zod.literal(""))
});

type FuelLogForm = zod.infer<typeof fuelLogSchema>;

export const FuelPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Filter States
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [fuelTypeFilter, setFuelTypeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("fuel_date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<FuelLog | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<FuelLog | null>(null);

  const createForm = useForm<FuelLogForm>({
    resolver: zodResolver(fuelLogSchema),
    defaultValues: {
      fuel_type: "DIESEL",
      fuel_quantity: 0,
      price_per_liter: 0,
      odometer_reading: 0,
      fuel_date: new Date().toISOString().split("T")[0]
    }
  });

  const editForm = useForm<FuelLogForm>({
    resolver: zodResolver(fuelLogSchema)
  });

  // Watch selected vehicle in modals to load its corresponding active trips
  const watchedVehicleId = createForm.watch("vehicle_id");
  const watchedEditVehicleId = editForm.watch("vehicle_id");

  // Auto-calculate total cost preview live in the modals
  const createQty = createForm.watch("fuel_quantity");
  const createPrice = createForm.watch("price_per_liter");
  const liveCreateTotal = (createQty && createPrice) ? createQty * createPrice : 0;

  const editQty = editForm.watch("fuel_quantity");
  const editPrice = editForm.watch("price_per_liter");
  const liveEditTotal = (editQty && editPrice) ? editQty * editPrice : 0;

  // Query fuel logs with filters
  const { data, isLoading, isError } = useQuery({
    queryKey: ["fuelLogs", page, search, vehicleFilter, fuelTypeFilter, startDateFilter, endDateFilter, sortBy, sortOrder],
    queryFn: () => fuelApi.list(
      page, 
      10, 
      search || undefined, 
      fuelTypeFilter || undefined, 
      vehicleFilter || undefined, 
      startDateFilter || undefined, 
      endDateFilter || undefined,
      sortBy,
      sortOrder
    ),
    placeholderData: (previousData) => previousData,
  });

  // Query global statistics for cards
  const { data: stats } = useQuery({
    queryKey: ["fuelStats"],
    queryFn: expensesApi.getStats,
  });

  // Query vehicles for filters and selections
  const { data: vehicles } = useQuery({
    queryKey: ["allVehicles"],
    queryFn: () => vehiclesApi.list(1, 100),
  });

  // Dynamic trips queries based on vehicle selection
  const { data: createTrips, isLoading: isCreateTripsLoading } = useQuery({
    queryKey: ["vehicleTrips", watchedVehicleId],
    queryFn: () => tripsApi.list(1, 100, undefined, "DISPATCHED", watchedVehicleId),
    enabled: !!watchedVehicleId
  });

  const { data: editTrips, isLoading: isEditTripsLoading } = useQuery({
    queryKey: ["vehicleTrips", watchedEditVehicleId],
    queryFn: () => tripsApi.list(1, 100, undefined, "DISPATCHED", watchedEditVehicleId),
    enabled: !!watchedEditVehicleId
  });

  // Clear trip field automatically when vehicle changes
  useEffect(() => {
    if (watchedVehicleId) {
      createForm.setValue("trip_id", "");
    }
  }, [watchedVehicleId, createForm]);

  useEffect(() => {
    if (selectedLog && watchedEditVehicleId && watchedEditVehicleId !== selectedLog.vehicle_id) {
      editForm.setValue("trip_id", "");
    }
  }, [watchedEditVehicleId, editForm, selectedLog]);

  // Combine current active trips + original trip for editing
  const editTripOptions = useMemo(() => {
    if (!selectedLog) return [];
    const active = editTrips?.data || [];
    const hasOriginal = active.some(t => t.id === selectedLog.trip_id);
    if (!hasOriginal && selectedLog.trip) {
      return [selectedLog.trip, ...active];
    }
    return active;
  }, [editTrips, selectedLog]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: fuelApi.create,
    onSuccess: () => {
      toast.success("Fuel transaction logged successfully!");
      queryClient.invalidateQueries({ queryKey: ["fuelLogs"] });
      queryClient.invalidateQueries({ queryKey: ["fuelStats"] });
      setCreateOpen(false);
      createForm.reset({
        fuel_type: "DIESEL",
        fuel_quantity: 0,
        price_per_liter: 0,
        odometer_reading: 0,
        fuel_date: new Date().toISOString().split("T")[0]
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to log fuel entry.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fuelApi.update(id, data),
    onSuccess: () => {
      toast.success("Fuel log details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["fuelLogs"] });
      queryClient.invalidateQueries({ queryKey: ["fuelStats"] });
      setEditOpen(false);
      setSelectedLog(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update fuel log.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: fuelApi.delete,
    onSuccess: () => {
      toast.success("Fuel log deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["fuelLogs"] });
      queryClient.invalidateQueries({ queryKey: ["fuelStats"] });
      setDeleteOpen(false);
      setLogToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete fuel log.");
    }
  });

  const openEditModal = (log: FuelLog) => {
    setSelectedLog(log);
    editForm.reset({
      vehicle_id: log.vehicle_id,
      trip_id: log.trip_id,
      fuel_type: log.fuel_type as any,
      station_name: log.station_name,
      location: log.location || "",
      fuel_quantity: log.fuel_quantity,
      price_per_liter: log.price_per_liter,
      odometer_reading: log.odometer_reading,
      fuel_date: log.fuel_date.split("T")[0],
      notes: log.notes || ""
    });
    setEditOpen(true);
  };

  const handleCreateSubmit = (data: FuelLogForm) => {
    createMutation.mutate({
      ...data,
      location: data.location || undefined,
      notes: data.notes || undefined
    });
  };

  const handleEditSubmit = (data: FuelLogForm) => {
    if (selectedLog) {
      updateMutation.mutate({
        id: selectedLog.id,
        data: {
          ...data,
          location: data.location || undefined,
          notes: data.notes || undefined
        }
      });
    }
  };

  const columns: ColumnDef<FuelLog>[] = [
    {
      header: "Vehicle",
      cell: (row) => (
        <div>
          <p className="font-semibold text-sm leading-tight text-foreground">{row.vehicle?.vehicle_name || "—"}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{row.vehicle?.registration_number || "—"}</p>
        </div>
      )
    },
    {
      header: "Trip Number",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-primary-600">
          {row.trip?.trip_number || "—"}
        </span>
      )
    },
    {
      header: "Fuel Type",
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.fuel_type}
        </span>
      )
    },
    {
      header: "Station",
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold">{row.station_name}</p>
          {row.location && <p className="text-[10px] text-muted-foreground mt-0.5">{row.location}</p>}
        </div>
      )
    },
    {
      header: "Quantity",
      cell: (row) => <span className="text-xs text-foreground font-medium">{row.fuel_quantity.toLocaleString()} L</span>
    },
    {
      header: "Price",
      cell: (row) => <span className="text-xs text-muted-foreground">${row.price_per_liter.toFixed(2)}/L</span>
    },
    {
      header: "Total Cost",
      cell: (row) => <span className="font-semibold text-sm text-foreground">${row.total_cost.toLocaleString()}</span>
    },
    {
      header: "Mileage",
      cell: (row) => (
        <span className="text-xs font-semibold text-emerald-600">
          {row.fuel_efficiency ? `${row.fuel_efficiency.toFixed(2)} km/L` : "—"}
        </span>
      )
    },
    {
      header: "Created By",
      cell: (row) => <span className="text-[11px] font-mono text-muted-foreground">{row.created_by_id.substring(0, 8)}</span>
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            title="Edit Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setLogToDelete(row);
              setDeleteOpen(true);
            }}
            title="Delete Log"
            className="p-1.5 border rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fuel Log Auditing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor refueling logs, fuel efficiency KPIs, and aggregate costs per vehicle.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fuel Log</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Fuel Cost"
            value={`$${stats.total_fuel_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
          />
          <StatsCard
            title="Total Fuel Logged"
            value={`${stats.total_fuel_quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} L`}
            icon={<Fuel className="w-5 h-5 text-blue-500" />}
          />
          <StatsCard
            title="Fuel Efficiency"
            value={stats.average_fuel_efficiency ? `${stats.average_fuel_efficiency.toFixed(2)} km/L` : "N/A"}
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
            description="Fleet average economy"
          />
          <StatsCard
            title="Average Cost / km"
            value={stats.cost_per_km ? `$${stats.cost_per_km.toFixed(2)}/km` : "N/A"}
            icon={<Gauge className="w-5 h-5 text-violet-500" />}
            description="Operational run rate"
          />
        </div>
      )}

      {/* Search and Filters Header */}
      <div className="flex flex-col gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station, trip..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none"
            />
          </div>

          {/* Vehicle Filter */}
          <select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none max-w-xs"
          >
            <option value="">All Vehicles</option>
            {vehicles?.data.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_name})</option>
            ))}
          </select>

          {/* Fuel Type Filter */}
          <select
            value={fuelTypeFilter}
            onChange={(e) => {
              setFuelTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
          >
            <option value="">All Fuel Types</option>
            <option value="DIESEL">Diesel</option>
            <option value="PETROL">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="ELECTRIC">Electric</option>
          </select>

          {/* Date range picker */}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 border rounded-lg bg-background text-xs focus:outline-none"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 border rounded-lg bg-background text-xs focus:outline-none"
            />
          </div>

          {/* Sorting controls */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none ml-auto"
          >
            <option value="fuel_date">Sort: Refuel Date</option>
            <option value="fuel_quantity">Sort: Quantity</option>
            <option value="total_cost">Sort: Total Cost</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve fuel log registry. Please check connection.</span>
        </div>
      )}

      {/* Main Table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No fuel logs logged"
            emptyDescription="Log refueling transactions to monitor average fuel efficiency and fleet operational costs."
          />

          {data && data.pagination.total_pages > 1 && (
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Log Fuel Transaction</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Vehicle</label>
                <select {...createForm.register("vehicle_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="">Select vehicle...</option>
                  {vehicles?.data.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_name})</option>
                  ))}
                </select>
                {createForm.formState.errors.vehicle_id && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.vehicle_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Active Trip</label>
                <select 
                  {...createForm.register("trip_id")} 
                  disabled={!watchedVehicleId || isCreateTripsLoading || !createTrips?.data || createTrips.data.length === 0}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm disabled:opacity-50"
                >
                  {!watchedVehicleId ? (
                    <option value="">Select vehicle first...</option>
                  ) : isCreateTripsLoading ? (
                    <option value="">Loading trips...</option>
                  ) : !createTrips?.data || createTrips.data.length === 0 ? (
                    <option value="">No active trip available</option>
                  ) : (
                    <>
                      <option value="">Select trip...</option>
                      {createTrips.data.map(t => (
                        <option key={t.id} value={t.id}>{t.trip_number} ({t.origin} → {t.destination})</option>
                      ))}
                    </>
                  )}
                </select>
                {createForm.formState.errors.trip_id && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.trip_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fuel Type</label>
                <select {...createForm.register("fuel_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="DIESEL">Diesel</option>
                  <option value="PETROL">Petrol</option>
                  <option value="CNG">CNG</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Station Name</label>
                <input type="text" {...createForm.register("station_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Shell Autocenters" />
                {createForm.formState.errors.station_name && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.station_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Quantity (Liters)</label>
                <input type="number" step="0.01" {...createForm.register("fuel_quantity", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.fuel_quantity && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.fuel_quantity.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Price / Liter ($)</label>
                <input type="number" step="0.01" {...createForm.register("price_per_liter", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.price_per_liter && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.price_per_liter.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Odometer (km)</label>
                <input type="number" {...createForm.register("odometer_reading", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.odometer_reading && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.odometer_reading.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fuel Date</label>
                <input type="date" {...createForm.register("fuel_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.fuel_date && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.fuel_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Location (Optional)</label>
                <input type="text" {...createForm.register("location")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Seattle Hwy Interstate-5" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Notes (Optional)</label>
                <textarea {...createForm.register("notes")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Fuel cost logs notes..." rows={2} />
              </div>

              {/* Total Cost live calculation panel */}
              <div className="col-span-2 p-3 bg-muted/40 border rounded-lg flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Calculated Total Fuel Cost:</span>
                <span className="font-bold text-base text-foreground">${liveCreateTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Fuel Details</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Vehicle</label>
                <select {...editForm.register("vehicle_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="">Select vehicle...</option>
                  {vehicles?.data.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_name})</option>
                  ))}
                </select>
                {editForm.formState.errors.vehicle_id && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.vehicle_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Active Trip</label>
                <select 
                  {...editForm.register("trip_id")} 
                  disabled={!watchedEditVehicleId || isEditTripsLoading}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm disabled:opacity-50"
                >
                  {!watchedEditVehicleId ? (
                    <option value="">Select vehicle first...</option>
                  ) : isEditTripsLoading ? (
                    <option value="">Loading trips...</option>
                  ) : (
                    <>
                      <option value="">Select trip...</option>
                      {editTripOptions.map(t => (
                        <option key={t.id} value={t.id}>{t.trip_number} ({t.origin} → {t.destination})</option>
                      ))}
                    </>
                  )}
                </select>
                {editForm.formState.errors.trip_id && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.trip_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fuel Type</label>
                <select {...editForm.register("fuel_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="DIESEL">Diesel</option>
                  <option value="PETROL">Petrol</option>
                  <option value="CNG">CNG</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Station Name</label>
                <input type="text" {...editForm.register("station_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.station_name && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.station_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Quantity (Liters)</label>
                <input type="number" step="0.01" {...editForm.register("fuel_quantity", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.fuel_quantity && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.fuel_quantity.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Price / Liter ($)</label>
                <input type="number" step="0.01" {...editForm.register("price_per_liter", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.price_per_liter && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.price_per_liter.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Odometer (km)</label>
                <input type="number" {...editForm.register("odometer_reading", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.odometer_reading && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.odometer_reading.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fuel Date</label>
                <input type="date" {...editForm.register("fuel_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.fuel_date && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.fuel_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Location (Optional)</label>
                <input type="text" {...editForm.register("location")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Notes (Optional)</label>
                <textarea {...editForm.register("notes")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" rows={2} />
              </div>

              {/* Total Cost live calculation panel */}
              <div className="col-span-2 p-3 bg-muted/40 border rounded-lg flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Calculated Total Fuel Cost:</span>
                <span className="font-bold text-base text-foreground">${liveEditTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteOpen && logToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(logToDelete.id)}
          title="Delete Fuel Transaction Log"
          message={`Are you sure you want to delete fuel log for ${logToDelete.vehicle?.vehicle_name} at ${logToDelete.station_name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};
