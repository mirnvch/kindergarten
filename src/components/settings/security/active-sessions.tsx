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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  RefreshCw,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import {
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  type SessionInfo,
} from "@/server/actions/security/sessions";

interface ActiveSessionsProps {
  currentJti?: string;
}

export function ActiveSessions({ currentJti }: ActiveSessionsProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getActiveSessions(currentJti);

      if (!result.success) {
        setError(result.error || "Failed to load sessions");
        return;
      }

      setSessions(result.data || []);
    } catch {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJti]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);

    try {
      const result = await revokeSession(sessionId);

      if (!result.success) {
        toast.error(result.error || "Failed to revoke session");
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!currentJti) {
      toast.error("Cannot revoke sessions");
      return;
    }

    setRevokingAll(true);

    try {
      const result = await revokeAllOtherSessions(currentJti);

      if (!result.success) {
        toast.error(result.error || "Failed to revoke sessions");
        return;
      }

      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(`Revoked ${result.data?.revokedCount || 0} session(s)`);
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
      setShowRevokeAll(false);
    }
  };

  const getDeviceIcon = (session: SessionInfo) => {
    const os = session.os?.toLowerCase() || "";

    if (os.includes("ios") || os.includes("android")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (os.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    }
    if (os.includes("mac") || os.includes("windows") || os.includes("linux")) {
      return <Laptop className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Active now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Active Sessions</CardTitle>
            </div>
            <div className="flex gap-2">
              {otherSessionsCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRevokeAll(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out All Others
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSessions}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          <CardDescription>
            Devices where you&apos;re currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>{error}</p>
              <Button variant="link" onClick={fetchSessions}>
                Try again
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 ${
                    session.isCurrent
                      ? "border-primary/20 bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    {getDeviceIcon(session)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {session.deviceName || "Unknown Device"}
                      </span>
                      {session.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {session.browser && <span>{session.browser}</span>}
                      {session.os && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{session.os}</span>
                        </>
                      )}
                      <span className="text-muted-foreground/50">•</span>
                      <span>{session.ipAddress}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last active: {getRelativeTime(session.lastActiveAt)}
                    </p>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revoking === session.id}
                    >
                      {revoking === session.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of all devices except this one. You&apos;ll need
              to sign in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              disabled={revokingAll}
            >
              {revokingAll ? "Signing out..." : "Sign Out All Others"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
