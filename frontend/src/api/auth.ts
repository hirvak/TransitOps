import { apiClient } from "../utils/apiClient";
import { User } from "../types";

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    
    const response = await apiClient.post("/auth/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    // Usually routes to get current user info. If there is a route like /users/me or /auth/me:
    // Let's check permissions.py or endpoints: the current user endpoint is /users/me or /auth/users/me?
    // Let's check where the backend defines the active user. Usually /users/me!
    const response = await apiClient.get("/auth/me");
    return response.data;
  },
  
  register: async (data: any): Promise<User> => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  }
};
