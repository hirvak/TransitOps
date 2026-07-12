import { apiClient } from "../utils/apiClient";
import { Trip, PaginatedList } from "../types";

export const tripsApi = {
  list: async (
    page = 1,
    pageSize = 10,
    search?: string,
    status?: string,
    vehicleId?: string,
    driverId?: string
  ): Promise<PaginatedList<Trip>> => {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (status) params.status = status;
    if (vehicleId) params.vehicle_id = vehicleId;
    if (driverId) params.driver_id = driverId;
    const response = await apiClient.get("/trips", { params });
    return response.data;
  },

  get: async (id: string): Promise<Trip> => {
    const response = await apiClient.get(`/trips/${id}`);
    return response.data;
  },

  create: async (data: Partial<Trip>): Promise<Trip> => {
    const response = await apiClient.post("/trips", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Trip>): Promise<Trip> => {
    const response = await apiClient.put(`/trips/${id}`, data);
    return response.data;
  },

  dispatch: async (id: string): Promise<Trip> => {
    const response = await apiClient.post(`/trips/${id}/dispatch`);
    return response.data;
  },

  complete: async (id: string, data: { actual_distance: number; fuel_consumed: number; revenue: number; end_odometer: number; remarks?: string }): Promise<Trip> => {
    const response = await apiClient.post(`/trips/${id}/complete`, data);
    return response.data;
  },

  cancel: async (id: string, remarks?: string): Promise<Trip> => {
    const response = await apiClient.post(`/trips/${id}/cancel`, { remarks });
    return response.data;
  }
};
