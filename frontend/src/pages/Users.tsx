import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { toast } from "sonner";
import { 
  UserPlus, 
  Search, 
  Shield, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Loader2,
  AlertCircle
} from "lucide-react";

import { usersApi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import { DataTable, ColumnDef } from "../components/DataTable";
import { SearchBar } from "../components/SearchBar";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { User, UserRole } from "../types";

// User Create validation schema
const createUserSchema = zod.object({
  email: zod.string().email("Please enter a valid email address."),
  full_name: zod.string().min(2, "Name must be at least 2 characters."),
  phone: zod.string().optional().or(zod.literal("")),
  role: zod.enum(["ADMIN", "FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]),
  password: zod.string().min(8, "Password must be at least 8 characters long.")
    .regex(/[a-z]/, "Must contain at least one lowercase letter.")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
    .regex(/\d/, "Must contain at least one digit.")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain at least one special character.")
});

// User Edit validation schema
const editUserSchema = zod.object({
  full_name: zod.string().min(2, "Name must be at least 2 characters."),
  phone: zod.string().optional().or(zod.literal("")),
  role: zod.enum(["ADMIN", "FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"])
});

type CreateUserForm = zod.infer<typeof createUserSchema>;
type EditUserForm = zod.infer<typeof editUserSchema>;

export const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  
  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Delete Dialog states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // React Hook Forms
  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "FLEET_MANAGER", phone: "" }
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema)
  });

  // Query users
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () => usersApi.list(page, 10, search),
    placeholderData: (previousData) => previousData,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success("User created successfully!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create user.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success("User updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update user.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      toast.success("User deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteOpen(false);
      setUserToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete user.");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => 
      active ? usersApi.deactivate(id) : usersApi.activate(id),
    onSuccess: (res) => {
      toast.success(`User account ${res.is_active ? "activated" : "deactivated"} successfully.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to change user status.");
    }
  });

  // Action handlers
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.role.name
    });
    setEditOpen(true);
  };

  const handleEditSubmit = (data: EditUserForm) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const handleCreateSubmit = (data: CreateUserForm) => {
    createMutation.mutate({
      ...data,
      phone: data.phone || undefined
    });
  };

  // Columns definition
  const columns: ColumnDef<User>[] = [
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 flex items-center justify-center font-semibold text-xs">
            {row.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight text-foreground">{row.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: "Role",
      cell: (row) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Shield className="w-3 h-3 text-slate-400" />
          <span>{row.role.name.replace("_", " ")}</span>
        </div>
      )
    },
    {
      header: "Phone",
      cell: (row) => <span className="text-muted-foreground">{row.phone || "—"}</span>
    },
    {
      header: "Status",
      cell: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          row.is_active 
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" 
            : "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
        }`}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      header: "Actions",
      cell: (row) => {
        const isSelf = row.id === currentUser?.id;
        return (
          <div className="flex items-center gap-2">
            {/* Toggle Status */}
            <button
              onClick={() => toggleStatusMutation.mutate({ id: row.id, active: row.is_active })}
              disabled={isSelf}
              title={row.is_active ? "Deactivate User" : "Activate User"}
              className={`p-1.5 border rounded-lg transition-colors ${
                row.is_active 
                  ? "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20" 
                  : "hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20"
              } disabled:opacity-30`}
            >
              {row.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </button>

            {/* Edit User */}
            <button
              onClick={() => openEditModal(row)}
              title="Edit Profile"
              className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete User */}
            <button
              onClick={() => {
                setUserToDelete(row);
                setDeleteOpen(true);
              }}
              disabled={isSelf}
              title="Delete User"
              className="p-1.5 border rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 disabled:opacity-30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system administrators, fleet operators, safety officers and analysts.</p>
        </div>
        <button
          onClick={() => {
            createForm.reset();
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search and filter block */}
      <div className="flex items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve user accounts. Please check your network connection.</span>
        </div>
      )}

      {/* User Accounts Table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No users found"
            emptyDescription="Try adjusting your search criteria or register a new user profile."
          />

          {/* Pagination controls */}
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
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-250">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add User Profile</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Full Name</label>
                <input type="text" {...createForm.register("full_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500" placeholder="Jane Doe" />
                {createForm.formState.errors.full_name && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.full_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email Address</label>
                <input type="email" {...createForm.register("email")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500" placeholder="jane@example.com" />
                {createForm.formState.errors.email && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.email.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Phone Number (Optional)</label>
                <input type="text" {...createForm.register("phone")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500" placeholder="+1 (555) 000-0000" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Role</label>
                <select {...createForm.register("role")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500">
                  <option value="ADMIN">Administrator</option>
                  <option value="FLEET_MANAGER">Fleet Manager</option>
                  <option value="DISPATCHER">Dispatcher</option>
                  <option value="SAFETY_OFFICER">Safety Officer</option>
                  <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Password</label>
                <input type="password" {...createForm.register("password")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500" placeholder="••••••••" />
                {createForm.formState.errors.password && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.password.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-250">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit User Details</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Full Name</label>
                <input type="text" {...editForm.register("full_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500" />
                {editForm.formState.errors.full_name && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.full_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Phone Number (Optional)</label>
                <input type="text" {...editForm.register("phone")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Role</label>
                <select 
                  {...editForm.register("role")} 
                  disabled={selectedUser.id === currentUser?.id}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="FLEET_MANAGER">Fleet Manager</option>
                  <option value="DISPATCHER">Dispatcher</option>
                  <option value="SAFETY_OFFICER">Safety Officer</option>
                  <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                </select>
                {selectedUser.id === currentUser?.id && (
                  <p className="text-[10px] text-muted-foreground mt-1">You cannot change your own system role.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteOpen && userToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(userToDelete.id)}
          title="Delete User Account"
          message={`Are you sure you want to delete ${userToDelete.full_name}? This action cannot be undone and will soft-delete their profile.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};
