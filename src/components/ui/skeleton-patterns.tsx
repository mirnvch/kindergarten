/**
 * Common skeleton patterns for loading states.
 *
 * Use these instead of spinners for a better perceived performance.
 */

import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Card Skeletons
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  className?: string;
  /** Show image placeholder */
  withImage?: boolean;
  /** Number of text lines */
  lines?: number;
}

// Deterministic widths for skeleton lines (avoids Math.random in render)
const LINE_WIDTHS = ["65%", "80%", "55%", "70%", "60%", "75%"];

export function SkeletonCard({ className, withImage = false, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={cn("space-y-3 p-4 rounded-lg border", className)}>
      {withImage && <Skeleton className="h-32 w-full rounded-md" />}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: LINE_WIDTHS[i % LINE_WIDTHS.length] }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  columns = 3,
  withImage = true,
}: {
  count?: number;
  columns?: number;
  withImage?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} withImage={withImage} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List Skeletons
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonListItemProps {
  className?: string;
  /** Show avatar/icon placeholder */
  withAvatar?: boolean;
  /** Show action button placeholder */
  withAction?: boolean;
}

export function SkeletonListItem({
  className,
  withAvatar = true,
  withAction = false,
}: SkeletonListItemProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b last:border-b-0", className)}>
      {withAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      {withAction && <Skeleton className="h-8 w-20 rounded-md shrink-0" />}
    </div>
  );
}

export function SkeletonList({
  count = 5,
  withAvatar = true,
  withAction = false,
}: {
  count?: number;
  withAvatar?: boolean;
  withAction?: boolean;
}) {
  return (
    <div className="divide-y rounded-lg border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} withAvatar={withAvatar} withAction={withAction} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Skeletons
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("rounded-lg border", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4 flex-1"
            style={{ maxWidth: i === 0 ? "30%" : `${100 / columns}%` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-b-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1"
              style={{
                maxWidth: colIndex === 0 ? "30%" : `${100 / columns}%`,
                width: LINE_WIDTHS[(rowIndex + colIndex) % LINE_WIDTHS.length],
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Skeletons
// ─────────────────────────────────────────────────────────────────────────────

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile/Dashboard Skeletons
// ─────────────────────────────────────────────────────────────────────────────

export function SkeletonProfile() {
  return (
    <div className="space-y-6">
      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Content */}
      <SkeletonCard lines={4} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      {/* Recent items */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <SkeletonList count={4} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Skeletons
// ─────────────────────────────────────────────────────────────────────────────

export function SkeletonAppointmentCard() {
  return (
    <div className="p-4 rounded-lg border space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-4 text-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonAppointmentList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAppointmentCard key={i} />
      ))}
    </div>
  );
}
