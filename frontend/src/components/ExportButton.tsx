import React from "react";
import { Download } from "lucide-react";

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  label = "Export CSV",
  className = "",
  disabled = false,
}) => {
  return (
    <button
      onClick={onExport}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg hover:bg-muted font-medium text-sm transition-colors disabled:opacity-50 ${className}`}
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
};
