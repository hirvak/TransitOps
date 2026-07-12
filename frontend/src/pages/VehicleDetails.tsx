import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Truck, 
  Calendar, 
  Gauge, 
  Scale, 
  DollarSign, 
  MapPin, 
  FileText,
  AlertCircle,
  Clock,
  Briefcase
} from "lucide-react";

import { vehiclesApi } from "../api/vehicles";
import { documentsApi } from "../api/documents";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const VehicleDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch single vehicle details
  const { data: vehicle, isLoading: isVehicleLoading, isError: isVehicleError } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => vehiclesApi.get(id || ""),
    enabled: !!id
  });

  // Fetch associated documents
  const { data: docs, isLoading: isDocsLoading } = useQuery({
    queryKey: ["vehicleDocuments", id],
    queryFn: () => documentsApi.list(1, 100, undefined, id),
    enabled: !!id
  });

  if (isVehicleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-sm mt-4">Loading vehicle data...</span>
      </div>
    );
  }

  if (isVehicleError || !vehicle) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl max-w-md mx-auto mt-12 bg-card">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">Vehicle Not Found</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          The vehicle you are trying to view does not exist or has been deleted.
        </p>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fleet</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/vehicles" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fleet Registry</span>
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{vehicle.vehicle_name}</h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Registration Number: <span className="font-mono font-semibold text-foreground">{vehicle.registration_number}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/vehicles/${vehicle.id}/financial`}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted text-sm font-semibold transition-colors shadow-sm"
          >
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Financial Summary</span>
          </Link>
        </div>
      </div>

      {/* Grid of specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Specifications panel */}
        <div className="bg-card border rounded-xl shadow-sm p-6 md:col-span-2 space-y-6">
          <h3 className="text-lg font-bold border-b pb-3">Technical Specifications</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Model</p>
                <p className="text-sm font-medium mt-0.5">{vehicle.vehicle_model}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Vehicle Type</p>
                <p className="text-sm font-medium mt-0.5 capitalize">{vehicle.vehicle_type.toLowerCase()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Maximum Load Capacity</p>
                <p className="text-sm font-medium mt-0.5">{vehicle.maximum_load_capacity.toLocaleString()} kg</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Odometer Reading</p>
                <p className="text-sm font-medium mt-0.5">{vehicle.odometer_reading.toLocaleString()} km</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Acquisition Cost</p>
                <p className="text-sm font-medium mt-0.5">${vehicle.acquisition_cost.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Purchase Date</p>
                <p className="text-sm font-medium mt-0.5">{new Date(vehicle.purchase_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Assigned Region</p>
                <p className="text-sm font-medium mt-0.5">{vehicle.region || "No region assigned"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents shortcuts */}
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-lg font-bold">Vehicle Documents</h3>
            <Link to="/documents" className="text-xs text-primary-600 hover:underline font-semibold">View All</Link>
          </div>

          <div className="space-y-4">
            {isDocsLoading && (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {!isDocsLoading && docs && docs.data.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded for this vehicle.</p>
            )}

            {!isDocsLoading && docs && docs.data.map((doc) => {
              const isExpired = new Date(doc.expiry_date) < new Date();
              return (
                <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{doc.document_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Type: {doc.document_type}</p>
                    <p className={`text-[10px] font-medium mt-1 ${isExpired ? "text-rose-600" : "text-muted-foreground"}`}>
                      Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
