import { apiClient } from "../utils/apiClient";
import { Expense, PaginatedList } from "../types";

export const expensesApi = {
  list: async (
    page = 1,
    pageSize = 10,
    search?: string,
    expenseType?: string,
    vehicleId?: string,
    startDate?: string,
    endDate?: string,
    sortBy = "expense_date",
    sortOrder = "desc"
  ): Promise<PaginatedList<Expense>> => {
    const params: any = { page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder };
    if (search) params.search = search;
    if (expenseType) params.expense_type = expenseType;
    if (vehicleId) params.vehicle_id = vehicleId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get("/expenses", { params });
    return response.data;
  },

  get: async (id: string): Promise<Expense> => {
    const response = await apiClient.get(`/expenses/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Expense> => {
    const response = await apiClient.post("/expenses", data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  update: async (id: string, data: any): Promise<Expense> => {
    const response = await apiClient.put(`/expenses/${id}`, data);
    return response.data;
  },

  getStats: async (): Promise<any> => {
    const response = await apiClient.get("/expenses/statistics");
    return response.data;
  }
};
