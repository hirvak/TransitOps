import React from "react";
import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

export const ComingSoon: React.FC = () => {
  const location = useLocation();
  const pageTitle = location.pathname.substring(1) || "Module";

  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-2xl bg-card shadow-sm max-w-2xl mx-auto mt-12 animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
        <Construction className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight capitalize">{pageTitle} Module</h2>
      <p className="text-muted-foreground text-sm max-w-md mt-2 mb-6">
        This section is currently under development. The database models and backend API endpoints are already completed. 
        CRUD integration features for this module will be added in subsequent phases.
      </p>
      <div className="text-xs text-muted-foreground font-mono bg-muted px-4 py-2 rounded-lg">
        Route: {location.pathname}
      </div>
    </div>
  );
};
