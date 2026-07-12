import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SidebarLayout } from "./layouts/SidebarLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { Vehicles } from "./pages/Vehicles";
import { VehicleDetails } from "./pages/VehicleDetails";
import { VehicleFinancialSummary } from "./pages/VehicleFinancialSummary";
import { Drivers } from "./pages/Drivers";
import { DriverDetails } from "./pages/DriverDetails";
import { Trips } from "./pages/Trips";
import { TripDetails } from "./pages/TripDetails";
import { Maintenance } from "./pages/Maintenance";
import { MaintenanceDetails } from "./pages/MaintenanceDetails";
import { FuelPage } from "./pages/Fuel";
import { Expenses } from "./pages/Expenses";
import { Documents } from "./pages/Documents";
import { NotificationsPage } from "./pages/Notifications";
import { Analytics } from "./pages/Analytics";
import { Reports } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";

// Initialize TanStack React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Workspace Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<SidebarLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                  <Route path="/vehicles/:id" element={<VehicleDetails />} />
                  <Route path="/vehicles/:id/financial" element={<VehicleFinancialSummary />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/drivers/:id" element={<DriverDetails />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/trips/:id" element={<TripDetails />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/maintenance/:id" element={<MaintenanceDetails />} />
                  <Route path="/fuel" element={<FuelPage />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  
                  {/* Catch-all dashboard fallback */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>

              {/* Default landing redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          
          {/* Global toast notification system container */}
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
