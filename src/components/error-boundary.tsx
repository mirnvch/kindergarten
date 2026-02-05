"use client";

/**
 * Error Boundary component for handling runtime errors gracefully.
 *
 * Use this in error.tsx files or wrap specific sections of your app.
 *
 * @example
 * // In app/dashboard/error.tsx
 * export default function DashboardError({ error, reset }: ErrorBoundaryProps) {
 *   return <ErrorBoundary error={error} reset={reset} />;
 * }
 *
 * @example
 * // Custom variant
 * <ErrorBoundary
 *   error={error}
 *   reset={reset}
 *   variant="minimal"
 *   title="Failed to load appointments"
 * />
 */

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Display variant */
  variant?: "default" | "minimal" | "full-page";
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Show error details in development */
  showDetails?: boolean;
  /** Custom class name */
  className?: string;
}

export function ErrorBoundary({
  error,
  reset,
  variant = "default",
  title,
  description,
  showDetails = process.env.NODE_ENV === "development",
  className,
}: ErrorBoundaryProps) {
  // Log error for debugging/monitoring
  useEffect(() => {
    console.error("Error boundary caught:", error);
    // TODO: Report to Sentry or other error tracking
  }, [error]);

  const errorTitle = title ?? "Something went wrong";
  const errorDescription = description ?? "We encountered an unexpected error. Please try again.";

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10",
          className
        )}
      >
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{errorTitle}</p>
          {showDetails && error.message && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{error.message}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (variant === "full-page") {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-4", className)}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{errorTitle}</h1>
            <p className="text-muted-foreground">{errorDescription}</p>
          </div>
          {showDetails && (
            <details className="text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-auto max-h-40">
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              <Home className="h-4 w-4 mr-2" />
              Go home
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-lg border border-dashed min-h-[300px]",
        className
      )}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold mb-1">{errorTitle}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{errorDescription}</p>
      {showDetails && error.message && (
        <details className="w-full max-w-sm mb-4">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
            <Bug className="h-3 w-3" />
            Show error details
          </summary>
          <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-32">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        </details>
      )}
      <Button onClick={reset}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error States for specific scenarios
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[200px]",
        className
      )}
    >
      {icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface NotFoundStateProps {
  resource?: string;
  backLink?: string;
  className?: string;
}

export function NotFoundState({
  resource = "Page",
  backLink = "/",
  className,
}: NotFoundStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[300px]",
        className
      )}
    >
      <div className="text-6xl font-bold text-muted-foreground/30 mb-4">404</div>
      <h2 className="text-xl font-semibold mb-2">{resource} not found</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The {resource.toLowerCase()} you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button variant="outline" onClick={() => (window.location.href = backLink)}>
        <Home className="h-4 w-4 mr-2" />
        Go back
      </Button>
    </div>
  );
}
