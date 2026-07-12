import { apiClient } from "../utils/apiClient";
import { EnhancedDashboardResponse, DashboardAlertsResponse, DashboardCharts } from "../types";

export const analyticsApi = {
  getDashboard: async (): Promise<EnhancedDashboardResponse> => {
    const response = await apiClient.get("/dashboard");
    return response.data;
  },

  getAlerts: async (): Promise<DashboardAlertsResponse> => {
    const response = await apiClient.get("/dashboard/alerts");
    return response.data;
  },

  getCharts: async (): Promise<DashboardCharts> => {
    const response = await apiClient.get("/dashboard/charts");
    return response.data;
  }
};
