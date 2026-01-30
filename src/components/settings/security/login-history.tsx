"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Monitor, Smartphone, Tablet, Check, X, RefreshCw } from "lucide-react";
import { getLoginHistory } from "@/server/actions/security/login-tracking";

interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  reason: string | null;
  createdAt: Date;
  device: string | null;
  browser: string | null;
  os: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
}

export function LoginHistory() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getLoginHistory(20);

      if (!result.success) {
        setError(result.error || "Failed to load login history");
        return;
      }

      setAttempts(result.data || []);
    } catch {
      setError("Failed to load login history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Login History</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHistory}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>
          Recent login attempts to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>{error}</p>
            <Button variant="link" onClick={fetchHistory}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No login history found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  !attempt.success ? "border-red-200 bg-red-50/50" : ""
                }`}
              >
                <div className="flex-shrink-0">
                  {attempt.success ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {attempt.success ? "Successful sign in" : "Failed sign in"}
                    </span>
                    {!attempt.success && attempt.reason && (
                      <Badge variant="outline" className="text-xs">
                        {attempt.reason}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {getDeviceIcon(attempt.deviceType)}
                      {attempt.device || "Unknown device"}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{attempt.ipAddress}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-medium">
                    {getRelativeTime(attempt.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(attempt.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
