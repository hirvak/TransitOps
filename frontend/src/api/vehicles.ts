import { apiClient } from "../utils/apiClient";
import { Vehicle, PaginatedList } from "../types";

export const vehiclesApi = {
  list: async (
    page = 1,
    pageSize = 10,
    search?: string,
    status?: string,
    region?: string,
    vehicleType?: string
  ): Promise<PaginatedList<Vehicle>> => {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (status) params.status = status;
    if (region) params.region = region;
    if (vehicleType) params.vehicle_type = vehicleType;
    const response = await apiClient.get("/vehicles", { params });
    return response.data;
  },

  get: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await apiClient.post("/vehicles", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await apiClient.put(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`);
  },

  getStats: async (): Promise<any> => {
    const response = await apiClient.get("/vehicles/statistics");
    return response.data;
  }
};
