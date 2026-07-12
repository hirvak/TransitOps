import React, { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No records found",
  description = "Get started by creating a new record.",
  icon = <Inbox className="w-12 h-12 text-muted-foreground" />,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl bg-card/50">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
};
