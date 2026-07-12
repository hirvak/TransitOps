import { apiClient } from "../utils/apiClient";
import { FuelLog, PaginatedList } from "../types";

export const fuelApi = {
  list: async (
    page = 1,
    pageSize = 10,
    search?: string,
    fuelType?: string,
    vehicleId?: string,
    startDate?: string,
    endDate?: string,
    sortBy = "fuel_date",
    sortOrder = "desc"
  ): Promise<PaginatedList<FuelLog>> => {
    const params: any = { page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder };
    if (search) params.search = search;
    if (fuelType) params.fuel_type = fuelType;
    if (vehicleId) params.vehicle_id = vehicleId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get("/fuel-logs", { params });
    return response.data;
  },

  getVehicleSummary: async (vehicleId: string): Promise<any> => {
    const response = await apiClient.get(`/fuel-logs/vehicles/${vehicleId}/summary`);
    return response.data;
  },

  get: async (id: string): Promise<FuelLog> => {
    const response = await apiClient.get(`/fuel-logs/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<FuelLog> => {
    const response = await apiClient.post("/fuel-logs", data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/fuel-logs/${id}`);
  },

  update: async (id: string, data: any): Promise<FuelLog> => {
    const response = await apiClient.put(`/fuel-logs/${id}`, data);
    return response.data;
  }
};
