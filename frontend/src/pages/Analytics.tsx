import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  DollarSign, 
  Fuel, 
  TrendingUp, 
  Wrench, 
  Scale, 
  AlertTriangle,
  Award,
  Flame,
  LineChart,
  Users,
  Briefcase,
  Map
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  CartesianGrid
} from "recharts";

import { expensesApi } from "../api/expenses";
import { reportsApi } from "../api/reports";
import { analyticsApi } from "../api/analytics";
import { StatsCard } from "../components/StatsCard";
import { ChartCard } from "../components/ChartCard";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "vehicles" | "drivers" | "financial">("overview");

  // Query global statistics
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ["analyticsStats"],
    queryFn: expensesApi.getStats,
  });

  // Query charts data (monthly revenue/expenses/fuel)
  const { data: chartData } = useQuery({
    queryKey: ["analyticsCharts"],
    queryFn: analyticsApi.getCharts,
  });

  // Query vehicle report for vehicle analytics sub-view
  const { data: vehicleReport } = useQuery({
    queryKey: ["analyticsVehicleReport"],
    queryFn: () => reportsApi.getVehiclesReport({ page: 1, page_size: 100 }),
    enabled: activeTab === "vehicles",
  });

  // Query driver report for driver performance sub-view
  const { data: driverReport } = useQuery({
    queryKey: ["analyticsDriverReport"],
    queryFn: () => reportsApi.getDriversReport({ page: 1, page_size: 100 }),
    enabled: activeTab === "drivers",
  });

  if (isStatsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4 font-sans">Computing fleet statistics...</span>
      </div>
    );
  }

  if (isStatsError || !stats) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Metrics Computation Error</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Failed to load dashboard metrics. Please check network logs.
        </p>
      </div>
    );
  }

  // Cost breakdown calculations
  const fuelCost = stats.total_fuel_cost || 0;
  const maintenanceCost = stats.maintenance_cost || 0;
  const otherCost = stats.total_other_expenses || 0;
  const totalCost = stats.operational_cost || 1;

  const fuelPct = (fuelCost / totalCost) * 100;
  const maintenancePct = (maintenanceCost / totalCost) * 100;
  const otherPct = (otherCost / totalCost) * 100;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          High-level operational stats, fuel economy ratios, and vehicle performance leaders.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-muted">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview & Costs
        </button>
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "vehicles"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Vehicle Analytics
        </button>
        <button
          onClick={() => setActiveTab("drivers")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "drivers"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Driver Analytics
        </button>
        <button
          onClick={() => setActiveTab("financial")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "financial"
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Financial Analytics
        </button>
      </div>

      {/* TAB CONTENTS: OVERVIEW & COSTS */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-250">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Operational Cost"
              value={`$${stats.operational_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
              description="Fuel + Maintenance + Other"
            />
            <StatsCard
              title="Fuel Purchases"
              value={`$${stats.total_fuel_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={<Fuel className="w-5 h-5 text-blue-500" />}
              description={`${stats.total_fuel_quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters filled`}
            />
            <StatsCard
              title="Maintenance Cost"
              value={`$${stats.maintenance_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={<Wrench className="w-5 h-5 text-amber-500" />}
              description="Completed repair jobs"
            />
            <StatsCard
              title="Average Cost / Km"
              value={`$${(stats.cost_per_km || 0).toFixed(2)}`}
              icon={<TrendingUp className="w-5 h-5 text-violet-500" />}
              description="Operational cost index"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stacked Cost bar */}
            <div className="lg:col-span-2">
              <ChartCard title="Operational Cost Allocation" subtitle="Breakdown of operational spend (Fuel vs Repairs vs incidentals)">
                <div className="space-y-6 py-4">
                  <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      style={{ width: `${fuelPct}%` }} 
                      className="bg-blue-500 hover:brightness-110 transition-all cursor-help"
                      title={`Fuel Cost: $${fuelCost.toLocaleString()}`}
                    />
                    <div 
                      style={{ width: `${maintenancePct}%` }} 
                      className="bg-amber-500 hover:brightness-110 transition-all cursor-help"
                      title={`Maintenance: $${maintenanceCost.toLocaleString()}`}
                    />
                    <div 
                      style={{ width: `${otherPct}%` }} 
                      className="bg-emerald-500 hover:brightness-110 transition-all cursor-help"
                      title={`Other: $${otherCost.toLocaleString()}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded bg-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fuel Purchases</p>
                        <p className="text-sm font-bold mt-0.5">${fuelCost.toLocaleString()} ({fuelPct.toFixed(1)}%)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded bg-amber-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Maintenance Repairs</p>
                        <p className="text-sm font-bold mt-0.5">${maintenanceCost.toLocaleString()} ({maintenancePct.toFixed(1)}%)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Other Expenses</p>
                        <p className="text-sm font-bold mt-0.5">${otherCost.toLocaleString()} ({otherPct.toFixed(1)}%)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Fleet Alerts & Insights */}
            <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
              <h3 className="text-lg font-bold border-b pb-3">Fleet Alerts & Insights</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-muted/20">
                  <Award className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Highest Expense Vehicle</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {stats.highest_expense_vehicle || "No data logged"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Linked to repair variances or mileage limits.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-muted/20">
                  <Flame className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Highest Fuel Consumer</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {stats.highest_fuel_consuming_vehicle || "No data logged"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Check for fuel efficiency drops or active transit routes.</p>
                  </div>
                </div>

                {stats.average_fuel_efficiency !== undefined && stats.average_fuel_efficiency !== null && (
                  <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-muted/20">
                    <LineChart className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Avg Fuel Efficiency</p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {stats.average_fuel_efficiency.toFixed(2)} km/L
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Average across active transport trips.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENTS: VEHICLE ANALYTICS */}
      {activeTab === "vehicles" && (
        <div className="space-y-6 animate-in fade-in duration-250">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Fuel Efficiency Bar Chart */}
            <ChartCard title="Fuel Efficiency by Vehicle" subtitle="Kilometers covered per Liter of fuel consumed.">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vehicleReport?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="registration_number" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value} km/L`, 'Efficiency']} />
                  <Bar dataKey="fuel_efficiency" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Efficiency" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Distance Covered Bar Chart */}
            <ChartCard title="Distance Logged (km)" subtitle="Total completed distance covered per vehicle registration.">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vehicleReport?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="registration_number" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value.toLocaleString()} km`, 'Distance']} />
                  <Bar dataKey="distance" fill="#10b981" radius={[4, 4, 0, 0]} name="Distance" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        </div>
      )}

      {/* TAB CONTENTS: DRIVER ANALYTICS */}
      {activeTab === "drivers" && (
        <div className="space-y-6 animate-in fade-in duration-250">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Revenue Generated by Driver */}
            <ChartCard title="Trips Revenue Generated" subtitle="Total freight profit dollars generated by each driver.">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={driverReport?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="full_name" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue_generated" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Completed Trips count */}
            <ChartCard title="Completed Route Dispatches" subtitle="Total number of dispatch runs successfully completed.">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={driverReport?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="full_name" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value} trips`, 'Completed']} />
                  <Bar dataKey="trips_completed" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Trips" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        </div>
      )}

      {/* TAB CONTENTS: FINANCIAL ANALYTICS */}
      {activeTab === "financial" && (
        <div className="space-y-6 animate-in fade-in duration-250">
          {chartData && (
            <div className="grid grid-cols-1 gap-6">
              
              {/* Financial area chart */}
              <ChartCard title="Monthly Revenue vs Operational Spend" subtitle="Aggregated overview of income vs running costs.">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.monthly_revenue.map((r, idx) => ({
                    month: r.month,
                    revenue: r.revenue,
                    expenses: chartData.monthly_expenses[idx]?.expenses || 0,
                    fuel: chartData.monthly_fuel_cost[idx]?.fuel_cost || 0
                  }))}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} name="Total Revenue ($)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2.5} name="Operating Expenses ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Monthly fuel cost trend */}
              <ChartCard title="Monthly Fuel Purchase Costs" subtitle="Refueling cost variances by calendar month.">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData.monthly_fuel_cost}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Fuel Cost']} />
                    <Bar dataKey="fuel_cost" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Fuel Costs" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
