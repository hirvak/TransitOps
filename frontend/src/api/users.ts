import { apiClient } from "../utils/apiClient";
import { User, PaginatedList } from "../types";

export const usersApi = {
  list: async (page = 1, pageSize = 10, search?: string): Promise<PaginatedList<User>> => {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    const response = await apiClient.get("/users", { params });
    return response.data;
  },

  get: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<User> => {
    const response = await apiClient.post("/users", data);
    return response.data;
  },

  update: async (id: string, data: any): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  activate: async (id: string): Promise<User> => {
    const response = await apiClient.patch(`/users/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: string): Promise<User> => {
    const response = await apiClient.patch(`/users/${id}/deactivate`);
    return response.data;
  }
};
