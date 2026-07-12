import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { toast } from "sonner";
import { Truck, Lock, Mail, Loader2 } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../api/auth";

const loginSchema = zod.object({
  email: zod.string().email("Please enter a valid email address."),
  password: zod.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormInput = zod.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInput) => {
    setSubmitting(true);
    try {
      // 1. Get access token
      const tokenResp = await authApi.login(data.email, data.password);
      
      // Temporary token storage in localStorage so profile query interceptor sees it
      localStorage.setItem("access_token", tokenResp.access_token);
      
      // 2. Query user profile
      const profile = await authApi.getCurrentUser();
      
      // 3. Complete login wrapper state
      login(tokenResp.access_token, profile);
      
      toast.success("Successfully logged in!");
      navigate("/dashboard");
    } catch (err: any) {
      localStorage.removeItem("access_token");
      console.error("Login failure", err);
      const detail = err.response?.data?.detail || "Invalid email or password.";
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border rounded-2xl shadow-xl max-w-md w-full overflow-hidden p-8 animate-in fade-in duration-300">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 mb-3">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">TransitOps</h2>
          <p className="text-muted-foreground text-sm mt-1">Smart Fleet Management System</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Email field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="email"
                {...register("email")}
                placeholder="email@example.com"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.email ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.password ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors shadow-md shadow-primary-500/10 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
