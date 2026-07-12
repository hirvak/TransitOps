import { apiClient } from "../utils/apiClient";
import { MaintenanceLog, PaginatedList } from "../types";

export const maintenanceApi = {
  list: async (page = 1, pageSize = 10, search?: string, status?: string): Promise<PaginatedList<MaintenanceLog>> => {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await apiClient.get("/maintenance", { params });
    return response.data;
  },

  get: async (id: string): Promise<MaintenanceLog> => {
    const response = await apiClient.get(`/maintenance/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<MaintenanceLog> => {
    const response = await apiClient.post("/maintenance", data);
    return response.data;
  },

  update: async (id: string, data: any): Promise<MaintenanceLog> => {
    const response = await apiClient.put(`/maintenance/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/maintenance/${id}`);
  }
};
