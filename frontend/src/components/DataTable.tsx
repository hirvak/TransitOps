import React from "react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  className = "",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`border rounded-xl bg-card shadow-sm overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={`border rounded-xl bg-card shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                {columns.map((col, cIdx) => {
                  let cellContent: React.ReactNode = "";
                  if (col.cell) {
                    cellContent = col.cell(row);
                  } else if (col.accessorKey) {
                    const val = (row as any)[col.accessorKey];
                    cellContent = val !== undefined && val !== null ? String(val) : "";
                  }
                  return (
                    <td key={cIdx} className="px-6 py-4 text-sm font-medium">
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
