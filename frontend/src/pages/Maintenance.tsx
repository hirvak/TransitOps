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
  X,
  Loader2,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  Wrench
} from "lucide-react";

import { maintenanceApi } from "../api/maintenance";
import { vehiclesApi } from "../api/vehicles";
import { DataTable, ColumnDef } from "../components/DataTable";
import { SearchBar } from "../components/SearchBar";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusBadge } from "../components/StatusBadge";
import { MaintenanceLog } from "../types";

// Validation schema for creating/updating a maintenance log
const maintenanceSchema = zod.object({
  vehicle_id: zod.string().min(1, "Please select a vehicle."),
  maintenance_type: zod.enum(["SCHEDULED", "UNSCHEDULED", "PREVENTATIVE", "REPAIR"]),
  description: zod.string().min(5, "Description must be at least 5 characters."),
  estimated_cost: zod.number().positive("Estimated cost must be greater than zero."),
  scheduled_date: zod.string().min(10, "Please enter a valid scheduled date (YYYY-MM-DD)."),
  remarks: zod.string().optional().or(zod.literal(""))
});

// Validation schema for completing maintenance
const completeSchema = zod.object({
  actual_cost: zod.number().positive("Actual cost must be greater than zero."),
  completion_date: zod.string().min(10, "Please enter a valid completion date (YYYY-MM-DD)."),
  remarks: zod.string().optional().or(zod.literal(""))
});

type MaintenanceForm = zod.infer<typeof maintenanceSchema>;
type CompleteForm = zod.infer<typeof completeSchema>;

export const Maintenance: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);

  // Complete modal
  const [completeOpen, setCompleteOpen] = useState(false);
  const [logToComplete, setLogToComplete] = useState<MaintenanceLog | null>(null);

  // Start checkup modal
  const [startOpen, setStartOpen] = useState(false);
  const [logToStart, setLogToStart] = useState<MaintenanceLog | null>(null);

  // Cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [logToCancel, setLogToCancel] = useState<MaintenanceLog | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<MaintenanceLog | null>(null);

  const createForm = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      maintenance_type: "PREVENTATIVE",
      estimated_cost: 250,
      scheduled_date: new Date().toISOString().split("T")[0]
    }
  });

  const editForm = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema)
  });

  const completeForm = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema)
  });

  // Query maintenance
  const { data, isLoading, isError } = useQuery({
    queryKey: ["maintenance", page, search, statusFilter],
    queryFn: () => maintenanceApi.list(page, 10, search, statusFilter || undefined),
    placeholderData: (previousData) => previousData,
  });

  // Query vehicles for selection
  const { data: vehicles } = useQuery({
    queryKey: ["allVehicles"],
    queryFn: () => vehiclesApi.list(1, 100),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: maintenanceApi.create,
    onSuccess: () => {
      toast.success("Maintenance schedule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to schedule maintenance.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceLog> }) => maintenanceApi.update(id, data),
    onSuccess: () => {
      toast.success("Maintenance details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setEditOpen(false);
      setSelectedLog(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update maintenance.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: maintenanceApi.delete,
    onSuccess: () => {
      toast.success("Maintenance log deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setDeleteOpen(false);
      setLogToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete maintenance log.");
    }
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => maintenanceApi.update(id, { status: "IN_PROGRESS" }),
    onSuccess: () => {
      toast.success("Maintenance checkup started.");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to start maintenance.");
    }
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteForm }) => 
      maintenanceApi.update(id, { ...data, status: "COMPLETED" }),
    onSuccess: () => {
      toast.success("Maintenance log marked as completed!");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setCompleteOpen(false);
      setLogToComplete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to complete maintenance.");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => maintenanceApi.update(id, { status: "CANCELLED" }),
    onSuccess: () => {
      toast.success("Maintenance schedule cancelled.");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to cancel maintenance.");
    }
  });

  const openEditModal = (log: MaintenanceLog) => {
    setSelectedLog(log);
    editForm.reset({
      vehicle_id: log.vehicle_id,
      maintenance_type: log.maintenance_type as any,
      description: log.description,
      estimated_cost: log.estimated_cost,
      scheduled_date: log.scheduled_date.split("T")[0],
      remarks: log.remarks || ""
    });
    setEditOpen(true);
  };

  const handleCreateSubmit = (data: MaintenanceForm) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: MaintenanceForm) => {
    if (selectedLog) {
      updateMutation.mutate({ id: selectedLog.id, data });
    }
  };

  const handleCompleteSubmit = (data: CompleteForm) => {
    if (logToComplete) {
      completeMutation.mutate({ id: logToComplete.id, data });
    }
  };

  const columns: ColumnDef<MaintenanceLog>[] = [
    {
      header: "Vehicle",
      cell: (row) => (
        <div>
          <p className="font-semibold text-sm leading-tight text-foreground">{row.vehicle?.vehicle_name || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{row.vehicle?.registration_number || "—"}</p>
        </div>
      )
    },
    {
      header: "Job Details",
      cell: (row) => (
        <div className="max-w-xs">
          <p className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full inline-block dark:bg-primary-950/20 dark:text-primary-400">
            {row.maintenance_type}
          </p>
          <p className="text-sm font-medium mt-1 truncate">{row.description}</p>
        </div>
      )
    },
    {
      header: "Scheduled Date",
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.scheduled_date).toLocaleDateString()}</span>
    },
    {
      header: "Est Cost",
      cell: (row) => <span>${row.estimated_cost.toLocaleString()}</span>
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
            to={`/maintenance/${row.id}`}
            title="View Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {/* Edit (Pending/In Progress only) */}
          {(row.status === "PENDING" || row.status === "IN_PROGRESS") && (
            <button
              onClick={() => openEditModal(row)}
              title="Edit Details"
              className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Start (Pending only) */}
          {row.status === "PENDING" && (
            <button
              onClick={() => {
                setLogToStart(row);
                setStartOpen(true);
              }}
              title="Start Checkup"
              className="p-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/20 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* Complete (In Progress only) */}
          {row.status === "IN_PROGRESS" && (
            <button
              onClick={() => {
                setLogToComplete(row);
                completeForm.reset({
                  actual_cost: row.estimated_cost,
                  completion_date: new Date().toISOString().split("T")[0],
                  remarks: ""
                });
                setCompleteOpen(true);
              }}
              title="Mark Complete"
              className="p-1.5 border border-primary-200 hover:bg-primary-50 text-primary-600 dark:hover:bg-primary-950/20 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}

          {/* Cancel (Pending/In Progress only) */}
          {(row.status === "PENDING" || row.status === "IN_PROGRESS") && (
            <button
              onClick={() => {
                setLogToCancel(row);
                setCancelOpen(true);
              }}
              title="Cancel Maintenance"
              className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}

          {/* Delete Log */}
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
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule and monitor preventative maintenance checkups, service records, and fleet downtime.</p>
        </div>
        <button
          onClick={() => {
            createForm.reset();
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search description, vehicle..."
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
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve maintenance data. Please check connection.</span>
        </div>
      )}

      {/* Main Data table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No maintenance logs scheduled"
            emptyDescription="Log vehicle checkups to monitor preventative repairs and operational service history."
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
              <h3 className="text-lg font-bold">Schedule Maintenance Service</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Vehicle</label>
                <select {...createForm.register("vehicle_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="">Select vehicle...</option>
                  {vehicles?.data.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicle_name} ({v.registration_number})</option>
                  ))}
                </select>
                {createForm.formState.errors.vehicle_id && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.vehicle_id.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Maintenance Type</label>
                <select {...createForm.register("maintenance_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="PREVENTATIVE">Preventative (PM)</option>
                  <option value="REPAIR">Repair</option>
                  <option value="SCHEDULED">Scheduled Check</option>
                  <option value="UNSCHEDULED">Unscheduled Repair</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Estimated Cost ($)</label>
                <input type="number" {...createForm.register("estimated_cost", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.estimated_cost && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.estimated_cost.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Scheduled Date</label>
                <input type="date" {...createForm.register("scheduled_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.scheduled_date && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.scheduled_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Job Description</label>
                <textarea {...createForm.register("description")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Details of repair, engine oil swap, tyre rotation..." rows={2} />
                {createForm.formState.errors.description && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.description.message}</p>}
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Schedule</span>
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
              <h3 className="text-lg font-bold">Edit Maintenance Details</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Vehicle</label>
                <select {...editForm.register("vehicle_id")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value={selectedLog.vehicle_id}>{selectedLog.vehicle?.vehicle_name || "Keep Assigned Vehicle"}</option>
                  {vehicles?.data.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicle_name} ({v.registration_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Maintenance Type</label>
                <select {...editForm.register("maintenance_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="PREVENTATIVE">Preventative (PM)</option>
                  <option value="REPAIR">Repair</option>
                  <option value="SCHEDULED">Scheduled Check</option>
                  <option value="UNSCHEDULED">Unscheduled Repair</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Estimated Cost ($)</label>
                <input type="number" {...editForm.register("estimated_cost", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.estimated_cost && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.estimated_cost.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Scheduled Date</label>
                <input type="date" {...editForm.register("scheduled_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.scheduled_date && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.scheduled_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Job Description</label>
                <textarea {...editForm.register("description")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" rows={2} />
                {editForm.formState.errors.description && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.description.message}</p>}
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

      {/* COMPLETE MAINTENANCE MODAL */}
      {completeOpen && logToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Complete Service Record</h3>
              <button onClick={() => setCompleteOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={completeForm.handleSubmit(handleCompleteSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Actual Cost ($)</label>
                <input type="number" {...completeForm.register("actual_cost", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {completeForm.formState.errors.actual_cost && <p className="text-rose-600 text-xs mt-1">{completeForm.formState.errors.actual_cost.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Completion Date</label>
                <input type="date" {...completeForm.register("completion_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {completeForm.formState.errors.completion_date && <p className="text-rose-600 text-xs mt-1">{completeForm.formState.errors.completion_date.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Closing Remarks (Optional)</label>
                <textarea {...completeForm.register("remarks")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Work completed successfully..." rows={2} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCompleteOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={completeMutation.isPending} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* START CONFIRM DIALOG */}
      {startOpen && logToStart && (
        <ConfirmDialog
          isOpen={startOpen}
          onCancel={() => {
            setStartOpen(false);
            setLogToStart(null);
          }}
          onConfirm={() => {
            startMutation.mutate(logToStart.id);
            setStartOpen(false);
            setLogToStart(null);
          }}
          title="Start Maintenance Checkup"
          message={`Are you sure you want to transition the maintenance log for vehicle ${logToStart.vehicle?.registration_number} to In Progress?`}
          confirmText="Start Work"
          cancelText="Cancel"
        />
      )}

      {/* CANCEL CONFIRM DIALOG */}
      {cancelOpen && logToCancel && (
        <ConfirmDialog
          isOpen={cancelOpen}
          onCancel={() => {
            setCancelOpen(false);
            setLogToCancel(null);
          }}
          onConfirm={() => {
            cancelMutation.mutate(logToCancel.id);
            setCancelOpen(false);
            setLogToCancel(null);
          }}
          title="Cancel Maintenance Schedule"
          message={`Are you sure you want to cancel the scheduled maintenance for vehicle ${logToCancel.vehicle?.registration_number}?`}
          confirmText="Cancel Schedule"
          cancelText="Go Back"
        />
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteOpen && logToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(logToDelete.id)}
          title="Delete Service Log"
          message={`Are you sure you want to delete maintenance record: "${logToDelete.description}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};
