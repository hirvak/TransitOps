import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Truck,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Zap,
  Activity,
  Award,
  ShieldCheck,
  MapPin,
  Calendar
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import { analyticsApi } from "../api/analytics";
import { notificationsApi } from "../api/notifications";
import { tripsApi } from "../api/trips";
import { fuelApi } from "../api/fuel";
import { reportsApi } from "../api/reports";
import { maintenanceApi } from "../api/maintenance";

import { StatsCard } from "../components/StatsCard";
import { ChartCard } from "../components/ChartCard";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch unified dashboard response
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: analyticsApi.getDashboard,
    refetchInterval: 30000, // Auto-refetch every 30s
  });

  // Fetch recent trips
  const { data: recentTrips } = useQuery({
    queryKey: ["dashboardRecentTrips"],
    queryFn: () => tripsApi.list(1, 5),
    refetchInterval: 30000
  });

  // Fetch recent maintenance logs
  const { data: recentMaint } = useQuery({
    queryKey: ["dashboardRecentMaint"],
    queryFn: () => maintenanceApi.list(1, 5),
    refetchInterval: 30000
  });

  // Fetch recent fuel logs
  const { data: recentFuel } = useQuery({
    queryKey: ["dashboardRecentFuel"],
    queryFn: () => fuelApi.list(1, 5),
    refetchInterval: 30000
  });

  // Fetch top performing vehicles
  const { data: topVehiclesData } = useQuery({
    queryKey: ["dashboardTopVehicles"],
    queryFn: () => reportsApi.getVehiclesReport({ page: 1, page_size: 5, sort_by: "profit", sort_order: "desc" }),
    refetchInterval: 30000
  });

  // Notification generation mutation trigger
  const generateNotificationsMutation = useMutation({
    mutationFn: notificationsApi.generate,
    onSuccess: (res) => {
      toast.success(res.message || "Scanned and updated notifications.");
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to trigger scan.");
    },
  });

  // Combine logs for Recent Activities
  const recentActivities = useMemo(() => {
    const list: any[] = [];
    
    if (recentTrips?.data) {
      recentTrips.data.forEach((t) => {
        list.push({
          id: `trip-${t.id}`,
          type: "TRIP",
          date: t.created_at,
          title: `Trip ${t.trip_number} Dispatched`,
          description: `${t.origin} → ${t.destination} • Status: ${t.status}`,
          color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20"
        });
      });
    }

    if (recentMaint?.data) {
      recentMaint.data.forEach((m) => {
        list.push({
          id: `maint-${m.id}`,
          type: "MAINTENANCE",
          date: m.scheduled_date,
          title: `Maintenance Job scheduled`,
          description: `${m.vehicle?.registration_number || "Vehicle"}: ${m.maintenance_type} (${m.status})`,
          color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20"
        });
      });
    }

    if (recentFuel?.data) {
      recentFuel.data.forEach((f) => {
        list.push({
          id: `fuel-${f.id}`,
          type: "FUEL",
          date: f.fuel_date,
          title: `Refueled ${f.fuel_quantity} Liters`,
          description: `${f.vehicle?.registration_number || "Vehicle"}: filled at ${f.station_name}`,
          color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
        });
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [recentTrips, recentMaint, recentFuel]);

  // Compute Operational Health Score dynamically
  const healthScore = useMemo(() => {
    if (!data) return 100;
    const criticals = data.alerts.critical.reduce((sum, item) => sum + (item.count || 0), 0);
    const warnings = data.alerts.warning.reduce((sum, item) => sum + (item.count || 0), 0);
    const score = 100 - (criticals * 8) - (warnings * 4);
    return Math.max(0, Math.min(100, score));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4 font-sans">Loading logistics data...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Failed to retrieve dashboard metrics</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          Please check that your backend FastAPI service is running and accessible.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const { kpis, charts, alerts } = data;
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time metrics for logistics and fleet analytics.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateNotificationsMutation.mutate()}
            disabled={generateNotificationsMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg hover:bg-muted font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {generateNotificationsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-500" />
            )}
            <span>Compliance Scan</span>
          </button>
          
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Vehicles"
          value={kpis.fleet.total_vehicles}
          icon={<Truck className="w-5 h-5" />}
          description={`${kpis.fleet.available} available | ${kpis.fleet.in_shop} in shop`}
        />
        <StatsCard
          title="Active Drivers"
          value={kpis.drivers.total_drivers}
          icon={<Users className="w-5 h-5" />}
          description={`${kpis.drivers.available} available | ${kpis.drivers.on_trip} on trip`}
        />
        <StatsCard
          title="Dispatched Trips"
          value={kpis.trips.active_trips}
          icon={<TrendingUp className="w-5 h-5" />}
          description={`Completed total: ${kpis.trips.completed}`}
        />
        <StatsCard
          title="Net Profit"
          value={`$${kpis.financial.net_profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          description={`Margin: ${kpis.expenses.operational_cost > 0 ? ((kpis.financial.total_revenue - kpis.expenses.operational_cost) / kpis.financial.total_revenue * 100).toFixed(1) : "0.0"}%`}
        />
      </div>

      {/* 2. Operational Health & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Critical Alerts */}
        <div className="bg-card text-card-foreground border border-rose-200 dark:border-rose-950/30 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-3 border-b pb-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-sm tracking-tight uppercase">Critical Alerts</h3>
          </div>
          <div className="space-y-2.5">
            {alerts.critical.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20">
                <span className="text-xs font-semibold">{c.title}</span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  {c.count} Active
                </span>
              </div>
            ))}
            {alerts.critical.every(c => c.count === 0) && (
              <p className="text-muted-foreground text-xs py-4 text-center">No critical warnings pending.</p>
            )}
          </div>
        </div>

        {/* Warnings & Status Expiry */}
        <div className="bg-card text-card-foreground border border-amber-200 dark:border-amber-950/30 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3 border-b pb-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-sm tracking-tight uppercase">Compliance Warnings</h3>
          </div>
          <div className="space-y-2.5">
            {alerts.warning.map((w, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20">
                <span className="text-xs font-semibold">{w.title}</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {w.count} Expiring
                </span>
              </div>
            ))}
            {alerts.warning.every(w => w.count === 0) && (
              <p className="text-muted-foreground text-xs py-4 text-center">No compliance warnings pending.</p>
            )}
          </div>
        </div>

        {/* Operational Health Circle Gauge */}
        <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-3 border-b pb-2">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-sm tracking-tight uppercase">Operational Health</h3>
          </div>
          <div className="flex items-center justify-around flex-1 py-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Simple CSS Circular Progress */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-muted fill-none" strokeWidth="8" />
                <circle cx="56" cy="56" r="48" 
                  className={`fill-none transition-all duration-500 ${
                    healthScore > 80 ? "stroke-emerald-500" : healthScore > 50 ? "stroke-amber-500" : "stroke-rose-500"
                  }`} 
                  strokeWidth="8" 
                  strokeDasharray={301.6} 
                  strokeDashoffset={301.6 - (301.6 * healthScore) / 100}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-mono">{healthScore}%</span>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">Score</span>
              </div>
            </div>
            <div className="text-xs space-y-1.5 flex-1 pl-4">
              <p className="font-bold text-foreground">Status: {healthScore > 80 ? "Optimal" : healthScore > 50 ? "Review Needed" : "Critical"}</p>
              <p className="text-muted-foreground text-[10px] leading-tight">
                Calculated based on active critical maintenance logs and expiring driver licenses.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Recharts Financial & Status Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Areas */}
        <div className="lg:col-span-2">
          <ChartCard title="Revenue & Expenses Trend" subtitle="Monthly aggregated financials tracking margins.">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.monthly_revenue.map((r, idx) => ({
                month: r.month,
                revenue: r.revenue,
                expenses: charts.monthly_expenses[idx]?.expenses || 0
              }))}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Revenue ($)" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} name="Expenses ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Vehicle Status Pie */}
        <div>
          <ChartCard title="Vehicle Status Share" subtitle="Breakdown of fleet active states.">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts.vehicle_status_pie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {charts.vehicle_status_pie.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2 text-[10px] font-semibold text-muted-foreground">
              {charts.vehicle_status_pie.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{entry.status} ({entry.count})</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

      </div>

      {/* 4. Trips Volumes & Maintenance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Trips Volume" subtitle="Tracks dispatch operations count per calendar month.">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.monthly_trips}>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Trips Count" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Maintenance Outcomes Bar */}
        <div>
          <ChartCard title="Maintenance Outcomes" subtitle="Aggregated monthly PM and repair outcomes.">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.maintenance_trend}>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>

      {/* 5. Recent Activity Feed & Top Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activities Timeline Feed */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b pb-3 text-primary-600 dark:text-primary-400">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold text-base text-foreground">Recent Log Activity Feed</h3>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent log entries detected.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex gap-4 items-start relative pb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.color}`}>
                    {act.type === "TRIP" ? <MapPin className="w-4 h-4" /> : act.type === "FUEL" ? <Zap className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0 border-b pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{act.title}</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(act.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performing Vehicles List */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b pb-3 text-amber-500">
            <Award className="w-5 h-5" />
            <h3 className="font-bold text-base text-foreground">Top Vehicles (Profit)</h3>
          </div>

          <div className="space-y-3">
            {topVehiclesData?.data?.slice(0, 5).map((veh: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg border bg-muted/20">
                <div>
                  <p className="font-semibold text-xs text-foreground truncate max-w-[120px]">{veh.vehicle_name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{veh.registration_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">${veh.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{veh.trips_completed} trips completed</p>
                </div>
              </div>
            ))}
            {(!topVehiclesData?.data || topVehiclesData.data.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-6">No vehicle report statistics available.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
