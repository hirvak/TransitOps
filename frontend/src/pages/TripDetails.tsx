import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Truck, 
  User, 
  AlertTriangle,
  Scale,
  Navigation,
  DollarSign,
  Droplet,
  CheckCircle,
  FileText,
  Clock
} from "lucide-react";

import { tripsApi } from "../api/trips";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Query trip
  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => tripsApi.get(id || ""),
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4">Loading trip logs...</span>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Trip Log Not Found</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          The requested trip route details are either unavailable or deleted.
        </p>
        <Link
          to="/trips"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Operations</span>
        </Link>
      </div>
    );
  }

  const getTimelineSteps = () => {
    const steps = [
      {
        label: "Trip Logged",
        time: trip.created_at,
        desc: "Draft itinerary created in fleet system.",
        done: true
      },
      {
        label: "Dispatched",
        time: trip.dispatch_time,
        desc: "Truck dispatched from base. Transit active.",
        done: !!trip.dispatch_time
      },
      {
        label: trip.status === "CANCELLED" ? "Trip Cancelled" : "Completed",
        time: trip.completion_time,
        desc: trip.status === "CANCELLED" 
          ? `Cargo route cancelled. Reason: ${trip.remarks || "No remarks provided"}`
          : "Delivery completed. final fuel and mileage logged.",
        done: !!trip.completion_time,
        cancelled: trip.status === "CANCELLED"
      }
    ];
    return steps;
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link to="/trips" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Operations</span>
        </Link>
      </div>

      {/* Header bar */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-xl flex items-center justify-center">
            <Navigation className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{trip.trip_number}</h1>
              <StatusBadge status={trip.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cargo Weight: <span className="font-semibold text-foreground">{trip.cargo_weight.toLocaleString()} kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Specifications and details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General specs card */}
          <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold border-b pb-3">Itinerary Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Origin Location</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{trip.origin}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-rose-500 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Destination Location</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{trip.destination}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Planned Departure</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {new Date(trip.planned_departure).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Cargo Payload Weight</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{trip.cargo_weight.toLocaleString()} kg</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Planned Distance</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{trip.planned_distance.toLocaleString()} km</p>
                </div>
              </div>

              {trip.actual_distance !== undefined && trip.actual_distance !== null && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Actual Distance Completed</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{trip.actual_distance.toLocaleString()} km</p>
                  </div>
                </div>
              )}
            </div>

            {trip.remarks && (
              <div className="p-4 bg-muted/40 rounded-xl border">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Operational Remarks</p>
                <p className="text-sm text-foreground">{trip.remarks}</p>
              </div>
            )}
          </div>

          {/* Allocation card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Vehicle Detail */}
            <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">Assigned Fleet Vehicle</h4>
              {trip.vehicle ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <Link to={`/vehicles/${trip.vehicle_id}`} className="font-semibold text-sm hover:underline text-primary-600">{trip.vehicle.vehicle_name}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{trip.vehicle.vehicle_model} • {trip.vehicle.registration_number}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No vehicle mapped.</p>
              )}
            </div>

            {/* Driver Detail */}
            <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">Assigned Driver Operator</h4>
              {trip.driver ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <Link to={`/drivers/${trip.driver_id}`} className="font-semibold text-sm hover:underline text-primary-600">{trip.driver.full_name}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{trip.driver.license_number} • {trip.driver.phone}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No driver mapped.</p>
              )}
            </div>

          </div>

          {/* Finance metrics card (Completed only) */}
          {trip.status === "COMPLETED" && (
            <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold border-b pb-3">Financial Performance Indicators</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-2.5">
                  <DollarSign className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Total Revenue</p>
                    <p className="text-lg font-bold mt-1 text-foreground">${trip.revenue?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Droplet className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Fuel Consumed</p>
                    <p className="text-lg font-bold mt-1 text-foreground">{trip.fuel_consumed} L</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Odometer Range</p>
                    <p className="text-xs font-semibold mt-1">
                      Start: {trip.start_odometer?.toLocaleString()} km <br/>
                      End: {trip.end_odometer?.toLocaleString()} km
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Tracking */}
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-bold border-b pb-3">Operational Timeline</h3>
          
          <div className="relative border-l-2 border-border pl-6 ml-2 space-y-8">
            {getTimelineSteps().map((step, idx) => (
              <div key={idx} className="relative">
                {/* Status Dot indicator */}
                <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${
                  step.cancelled 
                    ? "bg-rose-500 border-rose-500"
                    : step.done 
                      ? "bg-primary-600 border-primary-600" 
                      : "bg-background border-muted"
                }`} />

                {/* Details */}
                <div className={step.done ? "opacity-100" : "opacity-45"}>
                  <h4 className="text-sm font-bold text-foreground">{step.label}</h4>
                  {step.time && (
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      {new Date(step.time).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
