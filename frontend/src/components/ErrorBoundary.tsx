import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl p-6 max-w-md shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Application Rendering Error</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              A critical rendering exception occurred on this page. Our team has been notified.
            </p>
            {this.state.error && (
              <div className="bg-muted text-muted-foreground p-3 rounded-lg text-left text-xs font-mono mb-6 max-h-32 overflow-y-auto border">
                {this.state.error.message}
              </div>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Page</span>
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
