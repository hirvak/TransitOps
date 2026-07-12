import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  User, 
  Settings, 
  Shield, 
  Loader2, 
  Moon, 
  Sun,
  Lock,
  Mail,
  Phone
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { usersApi } from "../api/users";

const profileSchema = zod.object({
  full_name: zod.string().min(2, "Name must be at least 2 characters."),
  phone: zod.string().optional().or(zod.literal(""))
});

type ProfileForm = zod.infer<typeof profileSchema>;

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      phone: user?.phone || ""
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProfileForm>) => {
      if (!user) throw new Error("No user authenticated.");
      return usersApi.update(user.id, data);
    },
    onSuccess: async () => {
      toast.success("Profile updated successfully!");
      if (refreshUser) {
        await refreshUser();
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update profile settings.");
    }
  });

  const onSubmit = (data: ProfileForm) => {
    updateMutation.mutate({
      full_name: data.full_name,
      phone: data.phone || undefined
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.success(`Switched to ${nextTheme} theme`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customize your profile info, system preferences, and UI themes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Settings */}
        <div className="md:col-span-2 bg-card border rounded-xl shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-bold border-b pb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <span>Profile Settings</span>
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Email (Read-Only) */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Email Address (Read-Only)
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-muted text-muted-foreground text-sm focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Role (Read-Only) */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                System Role (Read-Only)
              </label>
              <div className="relative flex items-center">
                <Shield className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  disabled
                  value={user?.role?.name?.replace("_", " ") || ""}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-muted text-muted-foreground text-sm focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  {...register("full_name")}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 ${
                    errors.full_name ? "border-rose-400 focus:ring-rose-500" : "border-border focus:ring-primary-500"
                  }`}
                />
              </div>
              {errors.full_name && (
                <p className="text-rose-600 text-xs mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  {...register("phone")}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 border-border"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>

          </form>
        </div>

        {/* System Settings & Theme */}
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6 self-start">
          <h3 className="text-lg font-bold border-b pb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span>Preferences</span>
          </h3>

          <div className="space-y-4">
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Color Theme</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle dark/light mode interface.</p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
              </button>
            </div>

            {/* Units Toggle */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-semibold">Measurement Units</p>
                <p className="text-xs text-muted-foreground mt-0.5">Show distances in Metric (km).</p>
              </div>
              <select className="border rounded-lg bg-background text-xs px-2.5 py-1.5 focus:outline-none">
                <option value="METRIC">Metric (km)</option>
                <option value="IMPERIAL">Imperial (mi)</option>
              </select>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
