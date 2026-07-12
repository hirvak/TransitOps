import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const s = status.toUpperCase();

  const getColors = () => {
    switch (s) {
      case "AVAILABLE":
      case "COMPLETED":
      case "VALID":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      case "ON_TRIP":
      case "DISPATCHED":
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
      case "PENDING":
      case "EXPIRING_SOON":
      case "DRAFT":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "IN_SHOP":
      case "EXPIRED":
      case "SUSPENDED":
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30";
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getColors()} ${className}`}>
      {status}
    </span>
  );
};
