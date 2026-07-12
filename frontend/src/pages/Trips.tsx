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
  Eye, 
  X,
  Loader2,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  Edit2
} from "lucide-react";

import { tripsApi } from "../api/trips";
import { vehiclesApi } from "../api/vehicles";
import { driversApi } from "../api/drivers";
import { DataTable, ColumnDef } from "../components/DataTable";
import { SearchBar } from "../components/SearchBar";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusBadge } from "../components/StatusBadge";
import { Trip } from "../types";

// Validation schema for creating/updating a trip
const tripSchema = zod.object({
  origin: zod.string().min(2, "Origin location must be at least 2 characters."),
  destination: zod.string().min(2, "Destination location must be at least 2 characters."),
  vehicle_id: zod.string().min(1, "Please select an assigned vehicle."),
  driver_id: zod.string().min(1, "Please select an assigned driver."),
  cargo_weight: zod.number().positive("Cargo weight must be greater than zero."),
  planned_distance: zod.number().positive("Planned distance must be greater than zero."),
  planned_departure: zod.string().min(16, "Please select a valid planned departure datetime."),
  remarks: zod.string().optional().or(zod.literal(""))
});

// Validation schema for completing a trip
const completeTripSchema = zod.object({
  actual_distance: zod.number().positive("Actual distance must be greater than zero."),
  fuel_consumed: zod.number().positive("Fuel consumed must be greater than zero."),
  revenue: zod.number().nonnegative("Revenue must be non-negative."),
  end_odometer: zod.number().positive("End odometer reading must be positive."),
  remarks: zod.string().optional().or(zod.literal(""))
});

type TripForm = zod.infer<typeof tripSchema>;
type CompleteTripForm = zod.infer<typeof completeTripSchema>;

export const Trips: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Complete Trip modal
  const [completeOpen, setCompleteOpen] = useState(false);
  const [tripToComplete, setTripToComplete] = useState<Trip | null>(null);

  // Cancel Trip modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [tripToCancel, setTripToCancel] = useState<Trip | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState("");

  const createForm = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      cargo_weight: 12000,
      planned_distance: 350,
      planned_departure: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().substring(0, 16)
    }
  });

  const editForm = useForm<TripForm>({
    resolver: zodResolver(tripSchema)
  });

  const completeForm = useForm<CompleteTripForm>({
    resolver: zodResolver(completeTripSchema)
  });

  // Query trips
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", page, search, statusFilter],
    queryFn: () => tripsApi.list(page, 10, search, statusFilter || undefined),
    placeholderData: (previousData) => previousData,
  });

  // Query vehicles and drivers for drop-down menus
  const { data: vehicles } = useQuery({
    queryKey: ["allVehicles"],
    queryFn: () => vehiclesApi.list(1, 100, undefined, "AVAILABLE"),
  });

  const { data: drivers } = useQuery({
    queryKey: ["allDrivers"],
    queryFn: () => driversApi.list(1, 100, undefined, "AVAILABLE"),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: tripsApi.create,
    onSuccess: () => {
      toast.success("Trip logged as draft successfully!");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create trip.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) => tripsApi.update(id, data),
    onSuccess: () => {
      toast.success("Trip details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setEditOpen(false);
      setSelectedTrip(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update trip.");
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: tripsApi.dispatch,
    onSuccess: () => {
      toast.success("Trip dispatched successfully!");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to dispatch trip.");
    }
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteTripForm }) => tripsApi.complete(id, data),
    onSuccess: () => {
      toast.success("Trip completed successfully.");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setCompleteOpen(false);
      setTripToComplete(null);
      completeForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to complete trip.");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => tripsApi.cancel(id, remarks),
    onSuccess: () => {
      toast.success("Trip cancelled successfully.");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setCancelOpen(false);
      setTripToCancel(null);
      setCancelRemarks("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to cancel trip.");
    }
  });

  const openEditModal = (trip: Trip) => {
    setSelectedTrip(trip);
    editForm.reset({
      origin: trip.origin,
      destination: trip.destination,
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      cargo_weight: trip.cargo_weight,
      planned_distance: trip.planned_distance,
      planned_departure: trip.planned_departure.substring(0, 16),
      remarks: trip.remarks || ""
    });
    setEditOpen(true);
  };

  const handleCreateSubmit = (data: TripForm) => {
    createMutation.mutate({
      ...data,
      planned_departure: new Date(data.planned_departure).toISOString(),
      remarks: data.remarks || undefined
    });
  };

  const handleEditSubmit = (data: TripForm) => {
    if (selectedTrip) {
      updateMutation.mutate({
        id: selectedTrip.id,
        data: {
          ...data,
          planned_departure: new Date(data.planned_departure).toISOString(),
          remarks: data.remarks || undefined
        }
      });
    }
  };

  const handleCompleteSubmit = (data: CompleteTripForm) => {
    if (tripToComplete) {
      completeMutation.mutate({
        id: tripToComplete.id,
        data
      });
    }
  };

  const columns: ColumnDef<Trip>[] = [
    {
      header: "Trip Number",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-primary-600">
          <Link to={`/trips/${row.id}`} className="hover:underline">{row.trip_number}</Link>
        </span>
      )
    },
    {
      header: "Route",
      cell: (row) => (
        <div>
          <p className="text-sm font-semibold">{row.origin} → {row.destination}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Dist: {row.planned_distance} km</p>
        </div>
      )
    },
    {
      header: "Vehicle & Driver",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-foreground">Truck: {row.vehicle?.vehicle_name || "—"}</p>
          <p className="text-muted-foreground mt-0.5">Driver: {row.driver?.full_name || "—"}</p>
        </div>
      )
    },
    {
      header: "Planned Departure",
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-sans">
          {new Date(row.planned_departure).toLocaleString()}
        </span>
      )
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* Details Shortcut */}
          <Link
            to={`/trips/${row.id}`}
            title="View Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {/* Edit (Draft only) */}
          {row.status === "DRAFT" && (
            <button
              onClick={() => openEditModal(row)}
              title="Edit Draft Details"
              className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Dispatch Action (Draft only) */}
          {row.status === "DRAFT" && (
            <button
              onClick={() => dispatchMutation.mutate(row.id)}
              title="Dispatch Logistics Route"
              className="p-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/20 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* Complete Action (Dispatched only) */}
          {row.status === "DISPATCHED" && (
            <button
              onClick={() => {
                setTripToComplete(row);
                completeForm.reset({
                  actual_distance: row.planned_distance,
                  fuel_consumed: Math.round(row.planned_distance / 4), // estimation helper
                  revenue: row.cargo_weight * 0.1, // mock estimator
                  end_odometer: (row.vehicle?.odometer_reading || 0) + row.planned_distance,
                  remarks: ""
                });
                setCompleteOpen(true);
              }}
              title="Complete Dispatch Route"
              className="p-1.5 border border-primary-200 hover:bg-primary-50 text-primary-600 dark:hover:bg-primary-950/20 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}

          {/* Cancel Action (Draft / Dispatched only) */}
          {(row.status === "DRAFT" || row.status === "DISPATCHED") && (
            <button
              onClick={() => {
                setTripToCancel(row);
                setCancelRemarks("");
                setCancelOpen(true);
              }}
              title="Cancel Route"
              className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logistics Operations</h1>
          <p className="text-muted-foreground text-sm mt-1">Dispatch trips, complete cargo routes, track distances, and analyze revenues.</p>
        </div>
        <button
          onClick={() => {
            createForm.reset();
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch Trip</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trip number, route..."
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
          <option value="DRAFT">Draft</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve trip list. Please check connection.</span>
        </div>
      )}

      {/* Data Table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No trips logged"
            emptyDescription="Log a new trip draft to schedule transport routes and dispatch drivers."
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
              <h3 className="text-lg font-bold">Log New Trip Draft</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Origin Location</label>
                <input type="text" {...createForm.register("origin")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Seattle Port" />
                {createForm.formState.errors.origin && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.origin.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Destination Location</label>
                <input type="text" {...createForm.register("destination")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Denver Warehouse" />
                {createForm.formState.errors.destination && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.destination.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assign Vehicle</label>
                <select {...createForm.register("vehicle_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="">Select Vehicle...</option>
                  {vehicles?.data.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicle_name} ({v.registration_number})</option>
                  ))}
                </select>
                {createForm.formState.errors.vehicle_id && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.vehicle_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assign Driver</label>
                <select {...createForm.register("driver_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="">Select Driver...</option>
                  {drivers?.data.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
                {createForm.formState.errors.driver_id && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.driver_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cargo Weight (kg)</label>
                <input type="number" {...createForm.register("cargo_weight", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.cargo_weight && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.cargo_weight.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Planned Distance (km)</label>
                <input type="number" {...createForm.register("planned_distance", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.planned_distance && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.planned_distance.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Planned Departure Time</label>
                <input type="datetime-local" {...createForm.register("planned_departure")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.planned_departure && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.planned_departure.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Remarks (Optional)</label>
                <textarea {...createForm.register("remarks")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Special cargo instructions..." rows={2} />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Draft</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DRAFT MODAL */}
      {editOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Trip Details</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Origin Location</label>
                <input type="text" {...editForm.register("origin")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.origin && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.origin.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Destination Location</label>
                <input type="text" {...editForm.register("destination")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.destination && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.destination.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assign Vehicle</label>
                <select {...editForm.register("vehicle_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value={selectedTrip.vehicle_id}>{selectedTrip.vehicle?.vehicle_name || "Keep Assigned Vehicle"}</option>
                  {vehicles?.data.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicle_name} ({v.registration_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assign Driver</label>
                <select {...editForm.register("driver_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value={selectedTrip.driver_id}>{selectedTrip.driver?.full_name || "Keep Assigned Driver"}</option>
                  {drivers?.data.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cargo Weight (kg)</label>
                <input type="number" {...editForm.register("cargo_weight", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.cargo_weight && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.cargo_weight.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Planned Distance (km)</label>
                <input type="number" {...editForm.register("planned_distance", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.planned_distance && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.planned_distance.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Planned Departure Time</label>
                <input type="datetime-local" {...editForm.register("planned_departure")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.planned_departure && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.planned_departure.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Remarks (Optional)</label>
                <textarea {...editForm.register("remarks")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" rows={2} />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Specifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE TRIP MODAL */}
      {completeOpen && tripToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Complete Route Log</h3>
              <button onClick={() => setCompleteOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={completeForm.handleSubmit(handleCompleteSubmit)} className="space-y-4">
              <p className="text-xs text-muted-foreground">Please log final operations data for trip <span className="font-semibold text-foreground">{tripToComplete.trip_number}</span>.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Actual Distance (km)</label>
                  <input type="number" {...completeForm.register("actual_distance", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                  {completeForm.formState.errors.actual_distance && <p className="text-rose-600 text-xs mt-1">{completeForm.formState.errors.actual_distance.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fuel Consumed (L)</label>
                  <input type="number" {...completeForm.register("fuel_consumed", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                  {completeForm.formState.errors.fuel_consumed && <p className="text-rose-600 text-xs mt-1">{completeForm.formState.errors.fuel_consumed.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Revenue ($)</label>
                  <input type="number" {...completeForm.register("revenue", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                  {completeForm.formState.errors.revenue && <p className="text-rose-600 text-xs mt-1">{completeForm.formState.errors.revenue.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">End Odometer (km)</label>
                  <input type="number" {...completeForm.register("end_odometer", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                  {completeForm.formState.errors.end_odometer && <p className="text-rose-600 text-xs mt-1">{completeForm.formState.errors.end_odometer.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Closing Remarks (Optional)</label>
                <textarea {...completeForm.register("remarks")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Any delays, fuel station stops..." rows={2} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCompleteOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={completeMutation.isPending} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Complete Trip</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRM DIALOG */}
      {cancelOpen && tripToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2 text-rose-600">Cancel Cargo Trip</h3>
            <p className="text-sm text-muted-foreground mb-4">Are you sure you want to cancel trip <span className="font-semibold text-foreground">{tripToCancel.trip_number}</span>? This action cannot be undone.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Cancellation Reason</label>
                <textarea 
                  value={cancelRemarks} 
                  onChange={(e) => setCancelRemarks(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm" 
                  placeholder="Reason for cancellation..." 
                  rows={2} 
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setCancelOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Close</button>
                <button 
                  onClick={() => cancelMutation.mutate({ id: tripToCancel.id, remarks: cancelRemarks })} 
                  disabled={cancelMutation.isPending || !cancelRemarks.trim()} 
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Cancel Trip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
