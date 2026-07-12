import React, { useState } from "react";
import { Link, NavLink, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Truck,
  UserCheck,
  Navigation,
  Wrench,
  Fuel,
  DollarSign,
  FileText,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { notificationsApi } from "../api/notifications";

export const SidebarLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Poll unread notifications every 10 seconds
  const { data: notifications } = useQuery({
    queryKey: ["notifications", "drawer"],
    queryFn: () => notificationsApi.list(false),
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const unreadCount = notifications?.length || 0;
  const recentNotifications = notifications?.slice(0, 5) || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "DISPATCHER"] },
    { to: "/users", label: "Users", icon: <Users className="w-5 h-5" />, roles: ["ADMIN"] },
    { to: "/vehicles", label: "Vehicles", icon: <Truck className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
    { to: "/drivers", label: "Drivers", icon: <UserCheck className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER"] },
    { to: "/trips", label: "Trips", icon: <Navigation className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "DISPATCHER"] },
    { to: "/maintenance", label: "Maintenance", icon: <Wrench className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
    { to: "/fuel", label: "Fuel Logs", icon: <Fuel className="w-5 h-5" />, roles: ["ADMIN", "FINANCIAL_ANALYST"] },
    { to: "/expenses", label: "Expenses", icon: <DollarSign className="w-5 h-5" />, roles: ["ADMIN", "FINANCIAL_ANALYST"] },
    { to: "/documents", label: "Documents", icon: <FileText className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER"] },
    { to: "/notifications", label: "Notifications", icon: <Bell className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER"] },
    { to: "/analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
    { to: "/reports", label: "Reports", icon: <FileText className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
    { to: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" />, roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "DISPATCHER"] },
  ];

  // Helper to filter nav links by user role
  const allowedItems = navItems.filter((item) => {
    if (!user || !user.role) return false;
    return item.roles.includes(user.role.name);
  });

  // Breadcrumbs generator
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter((x) => x);
    return (
      <nav className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 capitalize font-sans">
        <Link to="/dashboard" className="hover:text-foreground">Home</Link>
        {paths.map((p, idx) => {
          const to = `/${paths.slice(0, idx + 1).join("/")}`;
          const isLast = idx === paths.length - 1;
          return (
            <React.Fragment key={idx}>
              <span>/</span>
              {isLast ? (
                <span className="text-foreground font-semibold">{p}</span>
              ) : (
                <Link to={to} className="hover:text-foreground">{p}</Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-muted/40 flex text-foreground font-sans">
      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      {/* Persistent / Responsive Drawer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-card flex flex-col justify-between transform transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo Section */}
          <div className="h-16 border-b flex items-center justify-between px-6 bg-card/60">
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary-600">
              <Truck className="w-6 h-6" />
              <span>TransitOps</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links Section */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-10rem)]">
            {allowedItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Logout Option */}
        <div className="p-4 border-t bg-card/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm bg-card/75 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 border rounded-lg hover:bg-muted"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">{getBreadcrumbs()}</div>
          </div>

          {/* Actions section */}
          <div className="flex items-center gap-4">
            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Alert Bell */}
            <div className="relative">
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="p-2 border rounded-lg hover:bg-muted text-muted-foreground transition-colors relative"
                aria-label="Toggle notifications drawer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {drawerOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDrawerOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-card border rounded-xl shadow-xl z-40 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                      <h4 className="font-bold text-sm text-foreground">Recent Alerts ({unreadCount})</h4>
                      <Link to="/notifications" onClick={() => setDrawerOpen(false)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold">View All</Link>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {recentNotifications.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">No unread notifications.</p>
                      ) : (
                        recentNotifications.map(n => (
                          <div key={n.id} className="p-2.5 rounded-lg bg-muted/40 border text-xs flex justify-between gap-3 items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{n.title}</p>
                              <p className="text-muted-foreground mt-0.5 leading-tight">{n.message}</p>
                            </div>
                            <button
                              onClick={() => markReadMutation.mutate(n.id)}
                              className="p-1 hover:bg-muted text-rose-500 hover:text-rose-600 rounded-lg flex-shrink-0 transition-colors"
                              title="Mark as Read"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-2 border-l pl-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400 flex items-center justify-center font-semibold text-sm">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold leading-none">{user?.full_name || "User Account"}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-1">{user?.role?.name || "Member"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
