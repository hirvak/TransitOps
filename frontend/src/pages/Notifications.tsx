import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  Calendar, 
  Settings, 
  RefreshCw,
  Eye,
  Info,
  CheckCircle2
} from "lucide-react";

import { notificationsApi } from "../api/notifications";
import { Notification } from "../types";

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Query notifications
  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => notificationsApi.list(unreadOnly),
    refetchInterval: 10000, // 10s auto-refresh
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      toast.success("Notification marked as read.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark notification as read.");
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: (res) => {
      toast.success(res.message || "All notifications marked as read.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark all as read.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      toast.success("Notification deleted.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to delete notification.");
    }
  });

  const generateMutation = useMutation({
    mutationFn: notificationsApi.generate,
    onSuccess: (res) => {
      toast.success(res.message || "Compliance scan completed.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to trigger compliance scan.");
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "VEHICLE_EXPIRY":
        return <Calendar className="w-5 h-5 text-rose-500" />;
      case "DRIVER_EXPIRY":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "MAINTENANCE_DUE":
        return <Settings className="w-5 h-5 text-blue-500" />;
      case "SYSTEM_ALERT":
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  const hasUnread = notifications?.some(n => !n.is_read);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit automated alerts regarding license expirations, preventative checkups, and system tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Compliance Scan Button */}
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            <span>Compliance Scan</span>
          </button>

          {/* Mark All Read Button */}
          {hasUnread && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4 text-sm font-medium">
          <button
            onClick={() => setUnreadOnly(false)}
            className={`pb-4 border-b-2 px-1 transition-all ${
              !unreadOnly 
                ? "border-primary-600 text-foreground font-semibold" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setUnreadOnly(true)}
            className={`pb-4 border-b-2 px-1 transition-all ${
              unreadOnly 
                ? "border-primary-600 text-foreground font-semibold" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Unread Alerts
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 border rounded-xl bg-card animate-pulse flex gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && notifications && notifications.length === 0 && (
        <div className="text-center py-12 border border-dashed rounded-2xl bg-card">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Clean Inbox</h3>
          <p className="text-muted-foreground text-sm mt-1">
            No system notifications currently logged. Try triggering a compliance scan.
          </p>
        </div>
      )}

      {/* Alert Feed */}
      {!isLoading && notifications && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border rounded-xl bg-card shadow-sm flex items-start gap-4 transition-colors ${
                notif.is_read ? "opacity-75" : "border-l-4 border-l-primary-500"
              }`}
            >
              <div className="p-2 bg-muted/60 dark:bg-muted/10 rounded-xl flex-shrink-0">
                {getNotificationIcon(notif.notification_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <h4 className={`text-sm font-bold text-foreground truncate ${notif.is_read ? "" : "font-semibold"}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-normal">{notif.message}</p>
                
                {/* Actions */}
                <div className="flex items-center gap-3 mt-3">
                  {!notif.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:underline"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark Read</span>
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(notif.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
