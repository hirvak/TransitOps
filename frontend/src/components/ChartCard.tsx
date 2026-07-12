import React, { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
  loading?: boolean;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  subtitle,
  loading = false,
}) => {
  return (
    <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-[240px] flex items-center justify-center relative">
        {loading ? (
          <div className="bg-muted/30 animate-pulse absolute inset-0 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading charts...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
