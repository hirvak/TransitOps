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
  UserCheck, 
  X,
  Loader2,
  AlertTriangle,
  UserX,
  FileBadge
} from "lucide-react";

import { driversApi } from "../api/drivers";
import { DataTable, ColumnDef } from "../components/DataTable";
import { SearchBar } from "../components/SearchBar";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusBadge } from "../components/StatusBadge";
import { Driver } from "../types";

const driverSchema = zod.object({
  full_name: zod.string().min(2, "Full name must be at least 2 characters."),
  email: zod.string().email("Please enter a valid email address."),
  phone: zod.string().min(5, "Phone number must be valid."),
  license_number: zod.string().min(3, "License number must be valid."),
  license_category: zod.string().min(1, "License category is required."),
  license_expiry: zod.string().min(10, "Please enter a valid expiry date (YYYY-MM-DD)."),
  safety_score: zod.number().min(0, "Safety score must be at least 0.").max(100, "Safety score cannot exceed 100."),
  status: zod.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]),
  is_active: zod.boolean()
});

type DriverForm = zod.infer<typeof driverSchema>;

export const Drivers: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  const createForm = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      status: "AVAILABLE",
      safety_score: 90,
      is_active: true,
      license_expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split("T")[0]
    }
  });

  const editForm = useForm<DriverForm>({
    resolver: zodResolver(driverSchema)
  });

  // Query drivers
  const { data, isLoading, isError } = useQuery({
    queryKey: ["drivers", page, search, statusFilter],
    queryFn: () => driversApi.list(page, 10, search, statusFilter || undefined),
    placeholderData: (previousData) => previousData,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: driversApi.create,
    onSuccess: () => {
      toast.success("Driver added successfully!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create driver.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) => driversApi.update(id, data),
    onSuccess: () => {
      toast.success("Driver updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setEditOpen(false);
      setSelectedDriver(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update driver.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: driversApi.delete,
    onSuccess: () => {
      toast.success("Driver deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setDeleteOpen(false);
      setDriverToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete driver.");
    }
  });

  const openEditModal = (driver: Driver) => {
    setSelectedDriver(driver);
    editForm.reset({
      full_name: driver.full_name,
      email: driver.email,
      phone: driver.phone,
      license_number: driver.license_number,
      license_category: driver.license_category,
      license_expiry: driver.license_expiry.split("T")[0],
      safety_score: driver.safety_score,
      status: driver.status,
      is_active: driver.is_active
    });
    setEditOpen(true);
  };

  const handleCreateSubmit = (data: DriverForm) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: DriverForm) => {
    if (selectedDriver) {
      updateMutation.mutate({ id: selectedDriver.id, data });
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400";
    if (score >= 75) return "text-blue-600 bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400";
    if (score >= 60) return "text-amber-600 bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400";
    return "text-rose-600 bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400";
  };

  const columns: ColumnDef<Driver>[] = [
    {
      header: "Driver Details",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 flex items-center justify-center font-semibold text-xs">
            {row.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight text-foreground">{row.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.email} • {row.phone}</p>
          </div>
        </div>
      )
    },
    {
      header: "License Info",
      cell: (row) => {
        const isExpired = new Date(row.license_expiry) < new Date();
        return (
          <div>
            <p className="font-mono text-xs font-semibold">{row.license_number} ({row.license_category})</p>
            <p className={`text-[10px] mt-0.5 ${isExpired ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
              Exp: {new Date(row.license_expiry).toLocaleDateString()} {isExpired && "⚠️"}
            </p>
          </div>
        );
      }
    },
    {
      header: "Safety Score",
      cell: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getSafetyScoreColor(row.safety_score)}`}>
          {row.safety_score}/100
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
            to={`/drivers/${row.id}`}
            title="View Profile Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {/* Toggle Suspend Status */}
          <button
            onClick={() => updateMutation.mutate({ 
              id: row.id, 
              data: { status: row.status === "SUSPENDED" ? "AVAILABLE" : "SUSPENDED" } 
            })}
            title={row.status === "SUSPENDED" ? "Activate Driver" : "Suspend Driver"}
            className={`p-1.5 border rounded-lg transition-colors ${
              row.status === "SUSPENDED" 
                ? "hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20" 
                : "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20"
            }`}
          >
            {row.status === "SUSPENDED" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
          </button>

          {/* Edit Specifications */}
          <button
            onClick={() => openEditModal(row)}
            title="Edit Specifications"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete Driver */}
          <button
            onClick={() => {
              setDriverToDelete(row);
              setDeleteOpen(true);
            }}
            title="Delete Driver"
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
          <h1 className="text-3xl font-bold tracking-tight">Driver Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage transport operators, license compliance, safety scores, and dispatcher allocations.</p>
        </div>
        <button
          onClick={() => {
            createForm.reset();
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Driver</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver name, license..."
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
          <option value="OFF_DUTY">Off Duty</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve driver list. Please check connection.</span>
        </div>
      )}

      {/* Data Table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No drivers found"
            emptyDescription="No drivers match the selected filter criteria. Add a driver profile or clear filters."
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
              <h3 className="text-lg font-bold">Add Driver Profile</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Full Name</label>
                <input type="text" {...createForm.register("full_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Michael Schumacher" />
                {createForm.formState.errors.full_name && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.full_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email Address</label>
                <input type="email" {...createForm.register("email")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="operator@example.com" />
                {createForm.formState.errors.email && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.email.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Phone Number</label>
                <input type="text" {...createForm.register("phone")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="+1 (555) 019-2834" />
                {createForm.formState.errors.phone && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">License #</label>
                <input type="text" {...createForm.register("license_number")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono" placeholder="DL-8293-9821A" />
                {createForm.formState.errors.license_number && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.license_number.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">License Category</label>
                <input type="text" {...createForm.register("license_category")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Class A Commercial (CDL)" />
                {createForm.formState.errors.license_category && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.license_category.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">License Expiry Date</label>
                <input type="date" {...createForm.register("license_expiry")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.license_expiry && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.license_expiry.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Safety Score (0 - 100)</label>
                <input type="number" {...createForm.register("safety_score", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.safety_score && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.safety_score.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                <select {...createForm.register("status")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" {...createForm.register("is_active")} id="create_active" className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                <label htmlFor="create_active" className="text-sm font-medium text-foreground select-none">Active Driver Profile</label>
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Driver</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Driver Profile</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Full Name</label>
                <input type="text" {...editForm.register("full_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.full_name && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.full_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email Address</label>
                <input type="email" {...editForm.register("email")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.email && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.email.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Phone Number</label>
                <input type="text" {...editForm.register("phone")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.phone && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">License #</label>
                <input type="text" {...editForm.register("license_number")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono" />
                {editForm.formState.errors.license_number && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.license_number.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">License Category</label>
                <input type="text" {...editForm.register("license_category")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.license_category && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.license_category.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">License Expiry Date</label>
                <input type="date" {...editForm.register("license_expiry")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.license_expiry && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.license_expiry.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Safety Score (0 - 100)</label>
                <input type="number" {...editForm.register("safety_score", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.safety_score && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.safety_score.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                <select {...editForm.register("status")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" {...editForm.register("is_active")} id="edit_active" className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                <label htmlFor="edit_active" className="text-sm font-medium text-foreground select-none">Active Driver Profile</label>
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
      {deleteOpen && driverToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(driverToDelete.id)}
          title="Delete Driver Profile"
          message={`Are you sure you want to delete driver ${driverToDelete.full_name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};
