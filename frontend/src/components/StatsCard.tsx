import React, { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  loading = false,
}) => {
  return (
    <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col justify-between">
      {loading ? (
        <div className="space-y-3">
          <div className="bg-muted animate-pulse h-4 w-24 rounded" />
          <div className="bg-muted animate-pulse h-8 w-16 rounded" />
          <div className="bg-muted animate-pulse h-3 w-32 rounded" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground text-sm font-medium">{title}</span>
            {icon && <div className="text-primary-500 bg-primary-50 dark:bg-primary-950/20 p-2 rounded-lg">{icon}</div>}
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            {(trend || description) && (
              <div className="flex items-center gap-1.5 mt-1">
                {trend && (
                  <span className={`text-xs font-semibold ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                    {trend.isPositive ? "+" : ""}{trend.value}%
                  </span>
                )}
                {description && <span className="text-muted-foreground text-xs">{description}</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
