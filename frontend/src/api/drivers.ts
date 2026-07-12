import { apiClient } from "../utils/apiClient";
import { Driver, PaginatedList } from "../types";

export const driversApi = {
  list: async (page = 1, pageSize = 10, search?: string, status?: string): Promise<PaginatedList<Driver>> => {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await apiClient.get("/drivers", { params });
    return response.data;
  },

  get: async (id: string): Promise<Driver> => {
    const response = await apiClient.get(`/drivers/${id}`);
    return response.data;
  },

  create: async (data: Partial<Driver>): Promise<Driver> => {
    const response = await apiClient.post("/drivers", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Driver>): Promise<Driver> => {
    const response = await apiClient.put(`/drivers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/drivers/${id}`);
  }
};
