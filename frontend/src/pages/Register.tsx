import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { toast } from "sonner";
import { Truck, Lock, Mail, User, Phone, Briefcase, Loader2 } from "lucide-react";
import { authApi } from "../api/auth";

const registerSchema = zod.object({
  email: zod.string().email("Please enter a valid email address."),
  full_name: zod.string().min(2, "Full name must be at least 2 characters."),
  phone: zod.string().optional().or(zod.literal("")),
  role: zod.enum(["ADMIN", "FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]),
  password: zod.string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/\d/, "Password must contain at least one digit.")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character."),
  confirmPassword: zod.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

type RegisterFormInput = zod.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const routerNavigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "FLEET_MANAGER"
    }
  });

  const onSubmit = async (data: RegisterFormInput) => {
    setSubmitting(true);
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...payload } = data;
      await authApi.register({
        ...payload,
        phone: payload.phone || null,
        profile_image: null
      });
      toast.success("Registration successful! You can now log in.");
      routerNavigate("/login");
    } catch (err: any) {
      console.error("Registration failure", err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === "string" ? detail : "Failed to register account. Please check constraints.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 py-12">
      <div className="bg-card text-card-foreground border rounded-2xl shadow-xl max-w-md w-full overflow-hidden p-8 animate-in fade-in duration-300">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 mb-3">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="text-muted-foreground text-sm mt-1">Register for TransitOps Fleet Management</p>
        </div>

        {/* Register form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Full Name field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="text"
                {...register("full_name")}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.full_name ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.full_name && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.full_name.message}</p>
            )}
          </div>

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
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.email ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Phone field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="tel"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.phone ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.phone.message}</p>
            )}
          </div>

          {/* Role select field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              System Role
            </label>
            <div className="relative flex items-center">
              <Briefcase className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <select
                {...register("role")}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.role ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              >
                <option value="ADMIN">Administrator</option>
                <option value="FLEET_MANAGER">Fleet Manager</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="SAFETY_OFFICER">Safety Officer</option>
                <option value="FINANCIAL_ANALYST">Financial Analyst</option>
              </select>
            </div>
            {errors.role && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.role.message}</p>
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
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.password ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="password"
                {...register("confirmPassword")}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.confirmPassword ? "border-rose-400 focus:ring-rose-500" : "border-border"
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="text-primary-600 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
