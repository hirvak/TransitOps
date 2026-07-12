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
  Layers,
  DollarSign,
  Briefcase,
  Calendar,
  PieChart as PieIcon
} from "lucide-react";
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";

import { expensesApi } from "../api/expenses";
import { vehiclesApi } from "../api/vehicles";
import { tripsApi } from "../api/trips";
import { DataTable, ColumnDef } from "../components/DataTable";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatsCard } from "../components/StatsCard";
import { ChartCard } from "../components/ChartCard";
import { Expense } from "../types";

// Validation schema for creating/updating an expense
const expenseSchema = zod.object({
  vehicle_id: zod.string().min(1, "Please select a vehicle."),
  trip_id: zod.string().optional().or(zod.literal("")),
  expense_type: zod.enum(["TOLL", "PARKING", "REPAIR", "INSURANCE", "FINE", "MISCELLANEOUS"]),
  amount: zod.number().positive("Amount must be greater than zero."),
  expense_date: zod.string().min(10, "Please enter a valid expense date (YYYY-MM-DD).")
    .refine((val) => new Date(val) <= new Date(), {
      message: "Expense date cannot be in the future."
    }),
  description: zod.string().min(2, "Description must be at least 2 characters.")
});

type ExpenseForm = zod.infer<typeof expenseSchema>;

export const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Filters State
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("expense_date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const createForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_type: "TOLL",
      amount: 0,
      expense_date: new Date().toISOString().split("T")[0],
      description: ""
    }
  });

  const editForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema)
  });

  // Watch selected vehicle to query matching dispatched trips
  const watchedVehicleId = createForm.watch("vehicle_id");
  const watchedEditVehicleId = editForm.watch("vehicle_id");

  // Query expenses with advanced filters
  const { data, isLoading, isError } = useQuery({
    queryKey: ["expenses", page, search, vehicleFilter, expenseTypeFilter, startDateFilter, endDateFilter, sortBy, sortOrder],
    queryFn: () => expensesApi.list(
      page, 
      10, 
      search || undefined, 
      expenseTypeFilter || undefined, 
      vehicleFilter || undefined, 
      startDateFilter || undefined, 
      endDateFilter || undefined,
      sortBy,
      sortOrder
    ),
    placeholderData: (previousData) => previousData,
  });

  // Query stats cards metrics
  const { data: stats } = useQuery({
    queryKey: ["expenseStats"],
    queryFn: expensesApi.getStats,
  });

  // Query vehicles for select option filters
  const { data: vehicles } = useQuery({
    queryKey: ["allVehicles"],
    queryFn: () => vehiclesApi.list(1, 100),
  });

  // Query trips dynamically for active vehicle
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

  // Automatically reset selected trip if vehicle choice updates
  useEffect(() => {
    if (watchedVehicleId) {
      createForm.setValue("trip_id", "");
    }
  }, [watchedVehicleId, createForm]);

  useEffect(() => {
    if (selectedExpense && watchedEditVehicleId && watchedEditVehicleId !== selectedExpense.vehicle_id) {
      editForm.setValue("trip_id", "");
    }
  }, [watchedEditVehicleId, editForm, selectedExpense]);

  // Combine fetched active trips + original trip mapping
  const editTripOptions = useMemo(() => {
    if (!selectedExpense) return [];
    const active = editTrips?.data || [];
    const hasOriginal = active.some(t => t.id === selectedExpense.trip_id);
    if (!hasOriginal && selectedExpense.trip) {
      return [selectedExpense.trip, ...active];
    }
    return active;
  }, [editTrips, selectedExpense]);

  // Compute category totals based on loaded data for charting
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    const totals = data.data.reduce((acc: Record<string, number>, curr) => {
      const type = curr.expense_type;
      acc[type] = (acc[type] || 0) + curr.amount;
      return acc;
    }, {});
    
    const colors: Record<string, string> = {
      TOLL: "#3b82f6",
      PARKING: "#10b981",
      REPAIR: "#f59e0b",
      INSURANCE: "#f43f5e",
      FINE: "#8b5cf6",
      MISCELLANEOUS: "#64748b"
    };

    return Object.keys(totals).map(key => ({
      name: key,
      value: totals[key],
      color: colors[key] || "#cbd5e1"
    }));
  }, [data]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success("Expense registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenseStats"] });
      setCreateOpen(false);
      createForm.reset({
        expense_type: "TOLL",
        amount: 0,
        expense_date: new Date().toISOString().split("T")[0],
        description: ""
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to log expense.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) => expensesApi.update(id, data),
    onSuccess: () => {
      toast.success("Expense details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenseStats"] });
      setEditOpen(false);
      setSelectedExpense(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update expense.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      toast.success("Expense record deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenseStats"] });
      setDeleteOpen(false);
      setExpenseToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete expense.");
    }
  });

  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    editForm.reset({
      vehicle_id: expense.vehicle_id,
      trip_id: expense.trip_id || "",
      expense_type: expense.expense_type as any,
      amount: expense.amount,
      expense_date: expense.expense_date.split("T")[0],
      description: expense.description
    });
    setEditOpen(true);
  };

  const handleCreateSubmit = (data: ExpenseForm) => {
    createMutation.mutate({
      ...data,
      trip_id: data.trip_id || undefined
    });
  };

  const handleEditSubmit = (data: ExpenseForm) => {
    if (selectedExpense) {
      updateMutation.mutate({
        id: selectedExpense.id,
        data: {
          ...data,
          trip_id: data.trip_id || undefined
        }
      });
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      header: "Vehicle Details",
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
      header: "Expense Type",
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.expense_type}
        </span>
      )
    },
    {
      header: "Description",
      cell: (row) => <span className="text-xs text-foreground font-medium">{row.description}</span>
    },
    {
      header: "Expense Date",
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.expense_date).toLocaleDateString()}</span>
    },
    {
      header: "Amount",
      cell: (row) => <span className="font-semibold text-sm text-foreground">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
              setExpenseToDelete(row);
              setDeleteOpen(true);
            }}
            title="Delete Expense"
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
          <h1 className="text-3xl font-bold tracking-tight">Expense Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track secondary operational expenses linked directly to trips and active fleets.
          </p>
        </div>
        <button
          onClick={() => {
            createForm.reset({
              expense_type: "TOLL",
              amount: 0,
              expense_date: new Date().toISOString().split("T")[0],
              description: ""
            });
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense Entry</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Operational Cost"
            value={`$${stats.operational_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            description="Global sum of all expenses"
          />
          <StatsCard
            title="Other Expenses"
            value={`$${stats.total_other_expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<Layers className="w-5 h-5 text-blue-500" />}
            description="Non-fuel incidentals"
          />
          <StatsCard
            title="Average Expense / Trip"
            value={`$${(stats.average_cost_per_trip || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<Briefcase className="w-5 h-5 text-amber-500" />}
            description="Mean cost allocation per route"
          />
        </div>
      )}

      {/* Recharts Allocation Distribution */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Category Allocation" subtitle="Expense distributions across active categories.">
              <div className="flex flex-col sm:flex-row items-center justify-around py-2 gap-4">
                <ResponsiveContainer width="100%" height={180} className="max-w-[200px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 max-w-md grid grid-cols-2 gap-2 text-xs">
                  {chartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold truncate uppercase text-[10px]">{item.name}</span>
                      </div>
                      <span className="font-bold ml-2">${item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="bg-card border rounded-xl shadow-sm p-5 flex flex-col justify-center">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost Audit Report</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This chart highlights the cost weight per category for the current list view. Focus cost control measures on repair tasks and insurance premium evaluations.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search header */}
      <div className="flex flex-col gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
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

          {/* Vehicle filter dropdown */}
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

          {/* Expense Type dropdown */}
          <select
            value={expenseTypeFilter}
            onChange={(e) => {
              setExpenseTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
          >
            <option value="">All Expense Categories</option>
            <option value="TOLL">Toll</option>
            <option value="PARKING">Parking</option>
            <option value="REPAIR">Repair</option>
            <option value="INSURANCE">Insurance</option>
            <option value="FINE">Fine</option>
            <option value="MISCELLANEOUS">Miscellaneous</option>
          </select>

          {/* Date Range selectors */}
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

          {/* Sort order settings */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none ml-auto"
          >
            <option value="expense_date">Sort: Ledger Date</option>
            <option value="amount">Sort: Amount</option>
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

      {/* Error View */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve expense ledger. Please check connection.</span>
        </div>
      )}

      {/* Main Table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No expenses registered"
            emptyDescription="Log a new expense entry linked to vehicles and dispatch routes to audit operational margins."
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
              <h3 className="text-lg font-bold">Add Expense Record</h3>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Associated Trip</label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expense Category</label>
                <select {...createForm.register("expense_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="TOLL">Toll</option>
                  <option value="PARKING">Parking</option>
                  <option value="REPAIR">Repair</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="FINE">Fine</option>
                  <option value="MISCELLANEOUS">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Cost Amount ($)</label>
                <input type="number" step="0.01" {...createForm.register("amount", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.amount && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.amount.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expense Date</label>
                <input type="date" {...createForm.register("expense_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.expense_date && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.expense_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label>
                <input type="text" {...createForm.register("description")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Toll fee for George Washington Bridge" />
                {createForm.formState.errors.description && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.description.message}</p>}
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Expense Record</h3>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Select Associated Trip</label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expense Category</label>
                <select {...editForm.register("expense_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="TOLL">Toll</option>
                  <option value="PARKING">Parking</option>
                  <option value="REPAIR">Repair</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="FINE">Fine</option>
                  <option value="MISCELLANEOUS">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Cost Amount ($)</label>
                <input type="number" step="0.01" {...editForm.register("amount", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.amount && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.amount.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expense Date</label>
                <input type="date" {...editForm.register("expense_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.expense_date && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.expense_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label>
                <input type="text" {...editForm.register("description")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.description && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.description.message}</p>}
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteOpen && expenseToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(expenseToDelete.id)}
          title="Delete Expense Entry"
          message={`Are you sure you want to delete the expense entry for ${expenseToDelete.description}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};
