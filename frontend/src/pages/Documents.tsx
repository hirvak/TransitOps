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
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  UploadCloud,
  FileUp
} from "lucide-react";

import { documentsApi } from "../api/documents";
import { vehiclesApi } from "../api/vehicles";
import { DataTable, ColumnDef } from "../components/DataTable";
import { Pagination } from "../components/Pagination";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatsCard } from "../components/StatsCard";
import { VehicleDocument } from "../types";

// Validation schema for creating a document (incorporates file upload)
const uploadDocSchema = zod.object({
  vehicle_id: zod.string().min(1, "Please select a vehicle."),
  document_name: zod.string().min(2, "Document name must be at least 2 characters."),
  document_type: zod.enum(["REGISTRATION", "INSURANCE", "PERMIT", "INSPECTION", "OTHER"]),
  document_number: zod.string().min(2, "Document number must be at least 2 characters."),
  expiry_date: zod.string().min(10, "Please enter a valid expiry date (YYYY-MM-DD)."),
  remarks: zod.string().optional().or(zod.literal(""))
});

// Validation schema for updating details only
const editDocSchema = zod.object({
  document_name: zod.string().min(2, "Document name must be at least 2 characters."),
  document_number: zod.string().min(2, "Document number must be at least 2 characters."),
  expiry_date: zod.string().min(10, "Please enter a valid expiry date (YYYY-MM-DD)."),
  remarks: zod.string().optional().or(zod.literal(""))
});

type UploadDocForm = zod.infer<typeof uploadDocSchema>;
type EditDocForm = zod.infer<typeof editDocSchema>;

export const Documents: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<VehicleDocument | null>(null);

  // File Upload Drag & Drop State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<VehicleDocument | null>(null);

  const createForm = useForm<UploadDocForm>({
    resolver: zodResolver(uploadDocSchema),
    defaultValues: {
      document_type: "REGISTRATION",
      remarks: ""
    }
  });

  const editForm = useForm<EditDocForm>({
    resolver: zodResolver(editDocSchema)
  });

  // Query documents with advanced filters
  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents", page, search, typeFilter, vehicleFilter, expiryFilter],
    queryFn: () => documentsApi.list(
      page, 
      10, 
      search || undefined, 
      vehicleFilter || undefined, 
      typeFilter || undefined,
      expiryFilter === "expired" ? true : undefined,
      expiryFilter === "expiring" ? true : undefined
    ),
    placeholderData: (previousData) => previousData,
  });

  // Query statistics for compliance metrics
  const { data: stats } = useQuery({
    queryKey: ["documentStats"],
    queryFn: documentsApi.getStats,
  });

  // Query vehicles for drop-down selection
  const { data: vehicles } = useQuery({
    queryKey: ["allVehicles"],
    queryFn: () => vehiclesApi.list(1, 100),
  });

  // Edit details mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleDocument> }) => documentsApi.update(id, data),
    onSuccess: () => {
      toast.success("Document updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documentStats"] });
      setEditOpen(false);
      setSelectedDoc(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update document.");
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      toast.success("Document deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documentStats"] });
      setDeleteOpen(false);
      setDocToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete document.");
    }
  });

  // File Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      toast.error("Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (formData: UploadDocForm) => {
    if (!selectedFile) {
      toast.error("Please drag & drop or select a file to upload.");
      return;
    }

    try {
      setUploadProgress(0);
      await documentsApi.upload(
        formData.vehicle_id,
        formData.document_name,
        formData.document_type,
        formData.expiry_date,
        selectedFile,
        (progressEvent: any) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      );
      toast.success("Document uploaded and registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documentStats"] });
      setCreateOpen(false);
      setSelectedFile(null);
      setUploadProgress(null);
      createForm.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to upload document file.");
      setUploadProgress(null);
    }
  };

  const handleEditSubmit = (data: EditDocForm) => {
    if (selectedDoc) {
      editMutation.mutate({
        id: selectedDoc.id,
        data: {
          document_name: data.document_name,
          document_number: data.document_number,
          expiry_date: data.expiry_date,
          remarks: data.remarks || undefined
        }
      });
    }
  };

  const handleDownload = async (doc: VehicleDocument) => {
    if (!doc.file_path || !doc.file_name) {
      toast.error("Document file path is unavailable.");
      return;
    }
    try {
      toast.info(`Fetching file: ${doc.file_name}...`);
      await documentsApi.download(doc.file_path, doc.file_name);
      toast.success("File downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to download file. It may not exist on the server.");
    }
  };

  const openEditModal = (doc: VehicleDocument) => {
    setSelectedDoc(doc);
    editForm.reset({
      document_name: doc.document_name,
      document_number: doc.document_number,
      expiry_date: doc.expiry_date.split("T")[0],
      remarks: doc.remarks || ""
    });
    setEditOpen(true);
  };

  const openDetailModal = (doc: VehicleDocument) => {
    setSelectedDoc(doc);
    setDetailOpen(true);
  };

  const columns: ColumnDef<VehicleDocument>[] = [
    {
      header: "Document Info",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm leading-tight text-foreground">{row.document_name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">No: {row.document_number}</p>
          </div>
        </div>
      )
    },
    {
      header: "Vehicle Details",
      cell: (row) => (
        <div>
          <p className="font-semibold text-sm leading-tight">{row.vehicle?.vehicle_name || "—"}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{row.vehicle?.registration_number || "—"}</p>
        </div>
      )
    },
    {
      header: "Type",
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.document_type}
        </span>
      )
    },
    {
      header: "Expiry Date",
      cell: (row) => {
        const isExpired = new Date(row.expiry_date) < new Date();
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={`text-xs font-semibold ${isExpired ? "text-rose-600 font-bold" : "text-foreground"}`}>
              {new Date(row.expiry_date).toLocaleDateString()} {isExpired && "⚠️"}
            </span>
          </div>
        );
      }
    },
    {
      header: "Compliance",
      cell: (row) => {
        const isExpired = new Date(row.expiry_date) < new Date();
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
            isExpired 
              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400" 
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
          }`}>
            {isExpired ? "Expired" : "Compliant"}
          </span>
        );
      }
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* View Details */}
          <button
            onClick={() => openDetailModal(row)}
            title="View Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={() => handleDownload(row)}
            title="Download Document"
            className="p-1.5 border border-primary-200 hover:bg-primary-50 text-primary-600 dark:hover:bg-primary-950/20 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            onClick={() => openEditModal(row)}
            title="Edit Details"
            className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              setDocToDelete(row);
              setDeleteOpen(true);
            }}
            title="Delete Document"
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
          <h1 className="text-3xl font-bold tracking-tight">Compliance Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Audit transport registrations, insurance policy files, safety permits, and expiry compliance.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedFile(null);
            setUploadProgress(null);
            createForm.reset({
              document_type: "REGISTRATION",
              remarks: ""
            });
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Documents"
            value={stats.total_documents}
            icon={<FileText className="w-5 h-5 text-muted-foreground" />}
          />
          <StatsCard
            title="Active Compliance"
            value={stats.valid}
            icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          />
          <StatsCard
            title="Expiring Soon"
            value={stats.expiring_30_days}
            icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
            description="Expiring in < 30 days"
          />
          <StatsCard
            title="Expired Files"
            value={stats.expired}
            icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
          />
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, registration..."
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

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
        >
          <option value="">All Document Types</option>
          <option value="REGISTRATION">Registration</option>
          <option value="INSURANCE">Insurance</option>
          <option value="PERMIT">Permit</option>
          <option value="INSPECTION">Inspection</option>
          <option value="OTHER">Other</option>
        </select>

        {/* Expiry Compliance filter */}
        <select
          value={expiryFilter}
          onChange={(e) => {
            setExpiryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
        >
          <option value="">All Compliance States</option>
          <option value="compliant">Compliant</option>
          <option value="expiring">Expiring Soon (30 days)</option>
          <option value="expired">Expired Only</option>
        </select>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 border border-rose-200 dark:border-rose-950/30 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Failed to retrieve compliance records. Please check connection.</span>
        </div>
      )}

      {/* Main Table */}
      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            emptyTitle="No documents registered"
            emptyDescription="Log active insurance coverages and vehicle registration cards to satisfy operator safety guidelines."
          />

          {data && data.pagination.total_pages > 1 && (
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* CREATE / UPLOAD MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upload Vehicle Document</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={createForm.handleSubmit(handleUploadSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Document Name</label>
                <input type="text" {...createForm.register("document_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" placeholder="Annual Commercial Insurance" />
                {createForm.formState.errors.document_name && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.document_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Document Number</label>
                <input type="text" {...createForm.register("document_number")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono" placeholder="POL-992-12-SF" />
                {createForm.formState.errors.document_number && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.document_number.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Document Type</label>
                <select {...createForm.register("document_type")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm">
                  <option value="REGISTRATION">Registration Proof</option>
                  <option value="INSURANCE">Insurance Policy</option>
                  <option value="PERMIT">Safety Permit</option>
                  <option value="INSPECTION">Inspection Certificate</option>
                  <option value="OTHER">Other Compliance File</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expiry Date</label>
                <input type="date" {...createForm.register("expiry_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {createForm.formState.errors.expiry_date && <p className="text-rose-600 text-xs mt-1">{createForm.formState.errors.expiry_date.message}</p>}
              </div>

              {/* Drag & Drop File Zone */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Upload Compliance Document</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors ${
                    isDragOver 
                      ? "border-primary-500 bg-primary-50/30 dark:bg-primary-950/10" 
                      : "border-muted hover:border-muted-foreground"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                    <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                    <span className="text-sm font-semibold text-primary-600 hover:underline">Choose file</span>
                    <span className="text-xs text-muted-foreground mt-1">or drag and drop PDF, JPG, PNG here</span>
                  </label>

                  {selectedFile && (
                    <div className="mt-4 p-2 bg-muted/50 border rounded-lg flex items-center gap-2 max-w-sm w-full text-xs">
                      <FileUp className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <span className="font-semibold truncate flex-1">{selectedFile.name}</span>
                      <span className="text-muted-foreground flex-shrink-0">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Remarks (Optional)</label>
                <textarea {...createForm.register("remarks")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" rows={2} />
              </div>

              {/* Progress bar */}
              {uploadProgress !== null && (
                <div className="col-span-2 space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={uploadProgress !== null} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  {uploadProgress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Document details</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Document Name</label>
                <input type="text" {...editForm.register("document_name")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.document_name && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.document_name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Document Number</label>
                <input type="text" {...editForm.register("document_number")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono" />
                {editForm.formState.errors.document_number && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.document_number.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expiry Date</label>
                <input type="date" {...editForm.register("expiry_date")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" />
                {editForm.formState.errors.expiry_date && <p className="text-rose-600 text-xs mt-1">{editForm.formState.errors.expiry_date.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Remarks (Optional)</label>
                <textarea {...editForm.register("remarks")} className="w-full px-3 py-2 border rounded-lg bg-background text-sm" rows={2} />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" disabled={editMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold">Compliance Details</h3>
              <button onClick={() => setDetailOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-3.5 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Document Name</p>
                <p className="font-semibold text-foreground">{selectedDoc.document_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Type</p>
                  <p className="font-medium text-foreground">{selectedDoc.document_type}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Number</p>
                  <p className="font-mono font-medium text-foreground">{selectedDoc.document_number}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Vehicle Assignment</p>
                <p className="font-medium text-foreground">{selectedDoc.vehicle?.vehicle_name} ({selectedDoc.vehicle?.registration_number})</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Issue Date</p>
                  <p className="font-medium text-foreground">{selectedDoc.issue_date ? new Date(selectedDoc.issue_date).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Expiry Date</p>
                  <p className="font-semibold text-foreground">{new Date(selectedDoc.expiry_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">File Name</p>
                <p className="font-mono text-xs text-foreground truncate">{selectedDoc.file_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Remarks</p>
                <p className="text-muted-foreground italic text-xs">{selectedDoc.remarks || "No remarks entered."}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => handleDownload(selectedDoc)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
              <button onClick={() => setDetailOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-muted">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteOpen && docToDelete && (
        <ConfirmDialog
          isOpen={deleteOpen}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(docToDelete.id)}
          title="Delete Compliance Document"
          message={`Are you sure you want to delete compliance document: "${docToDelete.document_name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

    </div>
  );
};
