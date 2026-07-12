import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  DollarSign, 
  Fuel, 
  Wrench, 
  Layers, 
  Gauge, 
  Map, 
  TrendingUp, 
  PieChart as PieIcon,
  AlertTriangle
} from "lucide-react";
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";

import { fuelApi } from "../api/fuel";
import { vehiclesApi } from "../api/vehicles";
import { StatsCard } from "../components/StatsCard";
import { ChartCard } from "../components/ChartCard";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const VehicleFinancialSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch vehicle details
  const { data: vehicle, isLoading: isVehicleLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => vehiclesApi.get(id || ""),
    enabled: !!id
  });

  // Fetch financial summary metrics from /fuel-logs/vehicles/{id}/summary
  const { data: summary, isLoading: isSummaryLoading, isError } = useQuery({
    queryKey: ["vehicleFinancialSummary", id],
    queryFn: () => fuelApi.getVehicleSummary(id || ""),
    enabled: !!id
  });

  if (isVehicleLoading || isSummaryLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4 font-sans">Compiling financial matrix...</span>
      </div>
    );
  }

  if (isError || !summary || !vehicle) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Financial Audit Unavailable</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          Failed to fetch the vehicle's financial records. Check network logs.
        </p>
        <Link
          to={`/vehicles/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Details</span>
        </Link>
      </div>
    );
  }

  // Cost data for Pie Chart
  const chartData = [
    { name: "Fuel Cost", value: summary.total_fuel_cost, color: "#3b82f6" },
    { name: "Maintenance Cost", value: summary.maintenance_cost, color: "#f59e0b" },
    { name: "Other Expenses", value: summary.total_expenses, color: "#f43f5e" }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to={`/vehicles/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {vehicle.vehicle_name}</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Financial Ledger</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Detailed operational metrics and cost breakdown for vehicle <span className="font-semibold text-foreground">{vehicle.registration_number}</span>.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Operational Cost"
          value={`$${summary.operational_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
          description="Fuel + Maint + Other Expenses"
        />
        <StatsCard
          title="Trips Executed"
          value={summary.total_trips}
          icon={<Map className="w-5 h-5 text-blue-500" />}
          description={`${(summary.total_distance || 0).toLocaleString()} km logged`}
        />
        <StatsCard
          title="Fuel Efficiency"
          value={summary.fuel_efficiency ? `${summary.fuel_efficiency.toFixed(2)} km/L` : "N/A"}
          icon={<Fuel className="w-5 h-5 text-amber-500" />}
          description={`${(summary.total_fuel_quantity || 0).toLocaleString()} Liters consumed`}
        />
        <StatsCard
          title="Cost / kilometer"
          value={summary.cost_per_km ? `$${summary.cost_per_km.toFixed(2)}/km` : "N/A"}
          icon={<Gauge className="w-5 h-5 text-violet-500" />}
          description="Operational cost index"
        />
      </div>

      {/* Visual Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cost Breakdown Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Cost Allocation Breakdown" subtitle="Detailed division of operational expenses.">
            {chartData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6">
                <ResponsiveContainer width="100%" height={200} className="max-w-[240px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3 flex-1 max-w-sm">
                  {chartData.map((item, idx) => {
                    const percent = summary.operational_cost > 0 ? (item.value / summary.operational_cost * 100).toFixed(1) : "0.0";
                    return (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-semibold">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{percent}% of total</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                <PieIcon className="w-8 h-8 mb-2 opacity-40" />
                <span>No expense entries logged for this vehicle.</span>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Audit Details Panel */}
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Operational Run Sheet</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span className="text-muted-foreground">Total Fuel Costs:</span>
              <span className="font-semibold text-foreground">${summary.total_fuel_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span className="text-muted-foreground">Total Maintenance Bills:</span>
              <span className="font-semibold text-foreground">${summary.maintenance_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span className="text-muted-foreground">Other Incidentals:</span>
              <span className="font-semibold text-foreground">${summary.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-dashed">
              <span className="text-muted-foreground">Average Odometer Rate:</span>
              <span className="font-semibold text-foreground">{summary.total_distance ? `${(summary.total_distance / summary.total_trips || 0).toFixed(0)} km / trip` : "—"}</span>
            </div>

            <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-950/10 px-3 rounded-lg text-emerald-700 dark:text-emerald-400 font-semibold mt-4">
              <span>Operational Cost:</span>
              <span>${summary.operational_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
