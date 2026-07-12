import { apiClient } from "../utils/apiClient";

export const reportsApi = {
  getVehiclesReport: async (params: any) => {
    const response = await apiClient.get("/reports/vehicles", { params });
    return response.data;
  },

  getDriversReport: async (params: any) => {
    const response = await apiClient.get("/reports/drivers", { params });
    return response.data;
  },

  getTripsReport: async (params: any) => {
    const response = await apiClient.get("/reports/trips", { params });
    return response.data;
  },

  getFuelReport: async (params: any) => {
    const response = await apiClient.get("/reports/fuel", { params });
    return response.data;
  },

  getExpensesReport: async (params: any) => {
    const response = await apiClient.get("/reports/expenses", { params });
    return response.data;
  },

  getMaintenanceReport: async (params: any) => {
    const response = await apiClient.get("/reports/maintenance", { params });
    return response.data;
  },

  getFinancialReport: async (params: any) => {
    const response = await apiClient.get("/reports/financial", { params });
    return response.data;
  }
};
