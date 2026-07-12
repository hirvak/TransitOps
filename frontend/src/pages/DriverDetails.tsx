import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  MapPin,
  Calendar,
  Navigation
} from "lucide-react";

import { driversApi } from "../api/drivers";
import { tripsApi } from "../api/trips";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const DriverDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch driver
  const { data: driver, isLoading: isDriverLoading, isError: isDriverError } = useQuery({
    queryKey: ["driver", id],
    queryFn: () => driversApi.get(id || ""),
    enabled: !!id
  });

  // Fetch driver's trips
  const { data: trips, isLoading: isTripsLoading } = useQuery({
    queryKey: ["driverTrips", id],
    queryFn: () => tripsApi.list(1, 100, undefined, undefined, undefined, id),
    enabled: !!id
  });

  if (isDriverLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4">Loading driver profile...</span>
      </div>
    );
  }

  if (isDriverError || !driver) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Driver Not Found</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          The driver profile you are trying to view does not exist or has been deleted.
        </p>
        <Link
          to="/drivers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Operators</span>
        </Link>
      </div>
    );
  }

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/20";
    if (score >= 75) return "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/20";
    if (score >= 60) return "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/20";
    return "text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/20";
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/drivers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Operators Registry</span>
        </Link>
      </div>

      {/* Header Profile summary */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-xl flex items-center justify-center font-bold text-xl uppercase">
            {driver.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{driver.full_name}</h1>
              <StatusBadge status={driver.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{driver.email}</span>
              <span className="text-muted-foreground">•</span>
              <Phone className="w-3.5 h-3.5" />
              <span>{driver.phone}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-muted/20">
          <ShieldCheck className="w-5 h-5 text-primary-600" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold leading-none">Safety Index</p>
            <p className={`text-base font-bold leading-none mt-1.5 px-2 py-0.5 rounded-full inline-block ${getSafetyScoreColor(driver.safety_score)}`}>
              {driver.safety_score} / 100
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Specifications */}
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-bold border-b pb-3">License & Status</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">License Number</p>
              <p className="text-sm font-semibold mt-1 font-mono text-foreground">{driver.license_number}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">License Category</p>
              <p className="text-sm font-medium mt-1">{driver.license_category}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">License Expiration</p>
              <p className="text-sm font-medium mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(driver.license_expiry).toLocaleDateString()}</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Profile Status</p>
              <p className="text-sm font-medium mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  driver.is_active 
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" 
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                }`}>
                  {driver.is_active ? "Active Profile" : "Inactive Profile"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Trips Assigned */}
        <div className="bg-card border rounded-xl shadow-sm p-6 lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold border-b pb-3">Assigned Trips History</h3>
          
          <div className="space-y-4">
            {isTripsLoading && (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {!isTripsLoading && trips && trips.data.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No trips assigned to this operator.</p>
            )}

            {!isTripsLoading && trips && trips.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3">Trip Number</th>
                      <th className="pb-3">Route</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Departure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trips.data.map((trip) => (
                      <tr key={trip.id} className="hover:bg-muted/10">
                        <td className="py-3 font-semibold text-sm">
                          <Link to={`/trips/${trip.id}`} className="text-primary-600 hover:underline">{trip.trip_number}</Link>
                        </td>
                        <td className="py-3 text-sm text-foreground">
                          {trip.origin} → {trip.destination}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={trip.status} />
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {new Date(trip.planned_departure).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
