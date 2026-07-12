import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";
import { authApi } from "../api/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userProfile: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load persisted session
    const savedToken = localStorage.getItem("access_token");
    const savedProfile = localStorage.getItem("user_profile");
    
    if (savedToken && savedProfile) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse user profile", e);
      }
    }
    setLoading(false);
  }, []);

  const login = (accessToken: string, userProfile: User) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("user_profile", JSON.stringify(userProfile));
    setToken(accessToken);
    setUser(userProfile);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authApi.getCurrentUser();
      localStorage.setItem("user_profile", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error("Failed to refresh user profile", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
