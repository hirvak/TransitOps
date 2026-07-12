import { apiClient } from "../utils/apiClient";
import { Notification } from "../types";

export const notificationsApi = {
  list: async (unreadOnly = false): Promise<Notification[]> => {
    const url = unreadOnly ? "/notifications/unread" : "/notifications";
    const response = await apiClient.get(url);
    return response.data;
  },

  generate: async (): Promise<{ message: string }> => {
    const response = await apiClient.post("/notifications/generate");
    return response.data;
  },

  markRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.patch("/notifications/read-all");
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  }
};
