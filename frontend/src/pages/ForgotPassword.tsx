import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { toast } from "sonner";
import { Truck, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const forgotSchema = zod.object({
  email: zod.string().email("Please enter a valid email address."),
});

type ForgotFormInput = zod.infer<typeof forgotSchema>;

export const ForgotPassword: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormInput>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormInput) => {
    setSubmitting(true);
    // Simulate sending recovery email
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success(`Instructions sent to ${data.email}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border rounded-2xl shadow-xl max-w-md w-full overflow-hidden p-8 animate-in fade-in duration-300">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 mb-3">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Reset Password</h2>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Enter your email and we'll send you recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-semibold">Check your Inbox</h3>
            <p className="text-muted-foreground text-sm">
              We've sent a password reset link to your email address. Please follow the instructions to reset your password.
            </p>
            <div className="pt-4">
              <Link to="/login" className="inline-flex items-center gap-2 text-primary-600 hover:underline font-semibold text-sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Instructions</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
