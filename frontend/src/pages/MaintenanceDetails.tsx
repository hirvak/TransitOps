import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Wrench, 
  Calendar, 
  DollarSign, 
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck
} from "lucide-react";

import { maintenanceApi } from "../api/maintenance";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const MaintenanceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Query maintenance log
  const { data: log, isLoading, isError } = useQuery({
    queryKey: ["maintenanceLog", id],
    queryFn: () => maintenanceApi.get(id || ""),
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4">Loading service logs...</span>
      </div>
    );
  }

  if (isError || !log) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Service Log Not Found</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          The requested vehicle maintenance checkup details are either unavailable or deleted.
        </p>
        <Link
          to="/maintenance"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Logs</span>
        </Link>
      </div>
    );
  }

  const costDifference = log.actual_cost && log.estimated_cost 
    ? log.actual_cost - log.estimated_cost 
    : 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link to="/maintenance" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Maintenance Logs</span>
        </Link>
      </div>

      {/* Header Profile summary */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-xl flex items-center justify-center">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{log.maintenance_type} Maintenance</h1>
              <StatusBadge status={log.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium text-foreground">
              {log.description}
            </p>
          </div>
        </div>
      </div>

      {/* Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Specifications panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold border-b pb-3">Service Log Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Scheduled Date</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {new Date(log.scheduled_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {log.completion_date && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Completion Date</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {new Date(log.completion_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Estimated Cost</p>
                  <p className="text-sm font-semibold text-foreground mt-1">${log.estimated_cost.toLocaleString()}</p>
                </div>
              </div>

              {log.actual_cost !== undefined && log.actual_cost !== null && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-primary-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Actual Cost</p>
                    <p className="text-sm font-semibold text-foreground mt-1">${log.actual_cost.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            {log.remarks && (
              <div className="p-4 bg-muted/40 rounded-xl border">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Service Remarks</p>
                <p className="text-sm text-foreground">{log.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mapped Vehicle info & Summary */}
        <div className="space-y-6">
          {/* Assigned vehicle */}
          <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-md font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Assigned Vehicle</h3>
            {log.vehicle ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <Link to={`/vehicles/${log.vehicle_id}`} className="font-semibold text-sm hover:underline text-primary-600">{log.vehicle.vehicle_name}</Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.vehicle.vehicle_model} • {log.vehicle.registration_number}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No vehicle mapped.</p>
            )}
          </div>

          {/* Cost comparison (completed only) */}
          {log.status === "COMPLETED" && (
            <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-md font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Budget Allocation</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span className="font-semibold">${log.estimated_cost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual Cost:</span>
                  <span className="font-semibold">${log.actual_cost}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Variance:</span>
                  <span className={`font-semibold ${costDifference > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {costDifference > 0 ? `+$${costDifference}` : `-$${Math.abs(costDifference)}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
