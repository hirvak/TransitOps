import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Eye, 
  Truck,
  Wrench,
  X,
  Loader2,
  AlertTriangle
} from "lucide-react";

import { vehiclesApi } from "../api/vehicles";
import { DataTable, ColumnDef } from "../components/DataTable";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatsCard } from "../components/StatsCard";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Vehicle } from "../types";

const vehicleSchema = zod.object({
  registration_number: zod.string().min(2, "Registration number must be at least 2 characters."),
  vehicle_name: zod.string().min(2, "Vehicle name must be at least 2 characters."),
  vehicle_model: zod.string().min(2, "Vehicle model must be at least 2 characters."),
  vehicle_type: zod.enum(["TRUCK", "VAN", "CAR", "OTHER"]),
  maximum_load_capacity: zod.number().positive("Maximum load capacity must be greater than zero."),
  odometer_reading: zod.number().nonnegative("Odometer reading must be non-negative."),
  acquisition_cost: zod.number().positive("Acquisition cost must be greater than zero."),
  purchase_date: zod.string().min(10, "Please enter a valid purchase date (YYYY-MM-DD)."),
  region: zod.string().optional().or(zod.literal("")),
  status: zod.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"])
});

type VehicleForm = zod.infer<typeof vehicleSchema>;

const VehiclesPageContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const createForm = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_type: "TRUCK",
      status: "AVAILABLE",
      maximum_load_capacity: 5000,
      odometer_reading: 0,
      acquisition_cost: 45000,
      purchase_date: new Date().toISOString().split("T")[0]
    }
  });

  const editForm = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema)
  });

  // Query vehicles list
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vehicles", page, search, statusFilter, regionFilter, typeFilter],
    queryFn: () => vehiclesApi.list(page, 10, search, statusFilter || undefined, regionFilter || undefined, typeFilter || undefined),
    placeholderData: (previousData) => previousData,
  });

  // Query statistics
  const { data: stats } = useQuery({
    queryKey: ["vehicleStats"],
    queryFn: vehiclesApi.getStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => {
      toast.success("Vehicle added successfully!");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicleStats"] });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create vehicle.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => vehiclesApi.update(id, data),
    onSuccess: () => {
      toast.success("Vehicle updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicleStats"] });
      setEditOpen(false);
      setSelectedVehicle(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update vehicle.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.delete,
    onSuccess: () => {
      toast.success("Vehicle deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicleStats"] });
      setDeleteOpen(false);
      setVehicleToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete vehicle.");
    }
  });

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    editForm.reset({
      registration_number: vehicle.registration_number ?? "",
      vehicle_name: vehicle.vehicle_name ?? "",
      vehicle_model: vehicle.vehicle_model ?? "",
      vehicle_type: vehicle.vehicle_type ?? "TRUCK",
      maximum_load_capacity: vehicle.maximum_load_capacity ?? 0,
      odometer_reading: vehicle.odometer_reading ?? 0,
      acquisition_cost: vehicle.acquisition_cost ?? 0,
      purchase_date: (vehicle.purchase_date || "").split("T")[0] || "",
      region: vehicle.region || "",
      status: vehicle.status ?? "AVAILABLE"
    });
    setEditOpen(true);
  };

  const handleCreateSubmit = (data: VehicleForm) => {
    createMutation.mutate({
      ...data,
      region: data.region || undefined
    });
  };

  const handleEditSubmit = (data: VehicleForm) => {
    if (selectedVehicle) {
      updateMutation.mutate({
        id: selectedVehicle.id,
        data: {
          ...data,
          region: data.region || undefined
        }
      });
    }
  };

  const columns: ColumnDef<Vehicle>[] = [
    {
      header: "Vehicle Details",
      cell: (row) => (
        <div>
          <p className="font-semibold text-sm leading-tight text-foreground">{row.vehicle_name ?? "Unnamed Vehicle"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {row.vehicle_model ?? "Unknown Model"} • {row.vehicle_type ?? "OTHER"}
          </p>
        </div>
      )
    },
    {
      header: "Registration #",
      cell: (row) => <span className="font-mono text-xs">{row.registration_number ?? "—"}</span>
    },
    {
      header: "Region",
      cell: (row) => <span className="text-muted-foreground">{row.region || "—"}</span>
    },
    {
      header: "Odometer",
      cell: (row) => <span>{(row.odometer_reading ?? 0).toLocaleString()} km</span>
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status ?? "AVAILABLE"} />
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* Details Shortcut */}
          <Link
            to={`/vehicles/${row.id}`}
            title="View Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {/* Edit Button */}
          <button
            onClick={() => openEditModal(row)}
            title="Edit Specifications"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Soft Delete */}
          <button
            onClick={() => {
              setVehicleToDelete(row);
              setDeleteOpen(true);
            }}
            title="Delete Vehicle"
            className="p-1.5 border rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // Safely grab vehicle array and pagination from data response
  const vehicles = data?.data ?? [];

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">Register and monitor transport vehicles, types, mileage, and maintenance logs.</p>
        </div>
        <button
          onClick={() => {
            createForm.reset({
              vehicle_type: "TRUCK",
              status: "AVAILABLE",
              maximum_load_capacity: 5000,
              odometer_reading: 0,
              acquisition_cost: 45000,
              purchase_date: new Date().toISOString().split("T")[0]
            });
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Vehicles"
            value={stats.total_vehicles ?? 0}
            icon={<Truck className="w-5 h-5" />}
          />
          <StatsCard
            title="Available"
            value={stats.available ?? 0}
            icon={<Truck className="w-5 h-5 text-emerald-500" />}
          />
          <StatsCard
            title="On Trip"
            value={stats.on_trip ?? 0}
            icon={<Truck className="w-5 h-5 text-blue-500" />}
          />
          <StatsCard
            title="In Shop"
            value={stats.in_shop ?? 0}
            icon={<Wrench className="w-5 h-5 text-amber-500" />}
          />
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search registration, name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_TRIP">On Trip</option>
          <option value="IN_SHOP">In Shop</option>
          <option value="RETIRED">Retired</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="TRUCK">Truck</option>
          <option value="VAN">Van</option>
          <option value="CAR">Car</option>
          <option value="OTHER">Other</option>
        </select>

        <input
          type="text"
          placeholder="Filter by region..."
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none max-w-[150px]"
        />
      </div>

      {/* Main Table */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve vehicle list. Please check connection.</span>
        </div>
      )}

      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={vehicles}
            loading={isLoading}
            emptyTitle="No vehicles found"
            emptyDescription="No vehicles match the selected filter criteria. Add a vehicle or clear search filters."
          />

          {data && data.pagination && data.pagination.total_pages > 1 && (
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
              <h3 className="text-lg font-bold">Add Vehicle</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Vehicle Name</label>
                <input type="text" {...createForm.register("vehicle_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Volvo FH16" />
                {createForm.formState.errors.vehicle_name && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.vehicle_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Registration #</label>
                <input type="text" {...createForm.register("registration_number")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono" placeholder="CA-992-12B" />
                {createForm.formState.errors.registration_number && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.registration_number.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Vehicle Model</label>
                <input type="text" {...createForm.register("vehicle_model")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="VNL 860 Sleeper" />
                {createForm.formState.errors.vehicle_model && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.vehicle_model.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Vehicle Type</label>
                <select {...createForm.register("vehicle_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                  <option value="CAR">Car</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                <select {...createForm.register("status")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="IN_SHOP">In Shop</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Load Capacity (kg)</label>
                <input type="number" {...createForm.register("maximum_load_capacity", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.maximum_load_capacity && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.maximum_load_capacity.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Odometer (km)</label>
                <input type="number" {...createForm.register("odometer_reading", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.odometer_reading && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.odometer_reading.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Acquisition Cost ($)</label>
                <input type="number" {...createForm.register("acquisition_cost", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.acquisition_cost && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.acquisition_cost.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Purchase Date</label>
                <input type="date" {...createForm.register("purchase_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.purchase_date && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.purchase_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Region (Optional)</label>
                <input type="text" {...createForm.register("region")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Northwest Logistics Center" />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Vehicle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Vehicle Specifications</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Vehicle Name</label>
                <input type="text" {...editForm.register("vehicle_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.vehicle_name && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.vehicle_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Registration #</label>
                <input type="text" {...editForm.register("registration_number")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono" />
                {editForm.formState.errors.registration_number && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.registration_number.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Vehicle Model</label>
                <input type="text" {...editForm.register("vehicle_model")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.vehicle_model && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.vehicle_model.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Vehicle Type</label>
                <select {...editForm.register("vehicle_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                  <option value="CAR">Car</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                <select {...editForm.register("status")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="IN_SHOP">In Shop</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Load Capacity (kg)</label>
                <input type="number" {...editForm.register("maximum_load_capacity", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.maximum_load_capacity && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.maximum_load_capacity.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Odometer (km)</label>
                <input type="number" {...editForm.register("odometer_reading", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.odometer_reading && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.odometer_reading.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Acquisition Cost ($)</label>
                <input type="number" {...editForm.register("acquisition_cost", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.acquisition_cost && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.acquisition_cost.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Purchase Date</label>
                <input type="date" {...editForm.register("purchase_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.purchase_date && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.purchase_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Region (Optional)</label>
                <input type="text" {...editForm.register("region")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteOpen && vehicleToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(vehicleToDelete.id)}
          title="Delete Vehicle"
          message={`Are you sure you want to delete ${vehicleToDelete.vehicle_name} (${vehicleToDelete.registration_number})? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};

export const Vehicles: React.FC = () => (
  <ErrorBoundary>
    <VehiclesPageContent />
  </ErrorBoundary>
);
