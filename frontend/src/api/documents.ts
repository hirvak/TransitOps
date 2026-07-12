import { apiClient } from "../utils/apiClient";
import { VehicleDocument, VehicleDocumentStats, PaginatedList } from "../types";

export const documentsApi = {
  list: async (
    page = 1,
    pageSize = 10,
    search?: string,
    vehicleId?: string,
    documentType?: string,
    expired?: boolean,
    expiringSoon?: boolean,
    sortBy = "created_at",
    sortOrder = "desc"
  ): Promise<PaginatedList<VehicleDocument>> => {
    const params: any = {
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (search) params.search = search;
    if (vehicleId) params.vehicle_id = vehicleId;
    if (documentType) params.document_type = documentType;
    if (expired !== undefined) params.expired = expired;
    if (expiringSoon !== undefined) params.expiring_soon = expiringSoon;

    const response = await apiClient.get("/vehicle-documents", { params });
    return response.data;
  },

  get: async (id: string): Promise<VehicleDocument> => {
    const response = await apiClient.get(`/vehicle-documents/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<VehicleDocument> => {
    const response = await apiClient.post("/vehicle-documents", data);
    return response.data;
  },

  update: async (id: string, data: any): Promise<VehicleDocument> => {
    const response = await apiClient.put(`/vehicle-documents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<VehicleDocument> => {
    const response = await apiClient.delete(`/vehicle-documents/${id}`);
    return response.data;
  },

  getStats: async (): Promise<VehicleDocumentStats> => {
    const response = await apiClient.get("/vehicle-documents/statistics");
    return response.data;
  },

  upload: async (
    vehicleId: string,
    documentName: string,
    documentType: string,
    expiryDate: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<VehicleDocument> => {
    const formData = new FormData();
    formData.append("document_name", documentName);
    formData.append("document_type", documentType);
    formData.append("expiry_date", expiryDate);
    formData.append("file", file);

    const response = await apiClient.post(`/vehicles/${vehicleId}/documents`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
    return response.data;
  },

  download: async (filePath: string, fileName: string): Promise<void> => {
    const response = await apiClient.get(`/${filePath}`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: (response.headers["content-type"] as string) || undefined });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
