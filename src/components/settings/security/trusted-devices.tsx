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
  Trash2,
  RefreshCw,
  Laptop,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTrustedDevices,
  removeTrustedDevice,
  removeAllTrustedDevices,
} from "@/server/actions/security/trusted-devices";

interface TrustedDevice {
  id: string;
  name: string | null;
  ipAddress: string;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export function TrustedDevices() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showRemoveAll, setShowRemoveAll] = useState(false);
  const [removingAll, setRemovingAll] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTrustedDevices();

      if (!result.success) {
        setError(result.error || "Failed to load trusted devices");
        return;
      }

      setDevices(result.data || []);
    } catch {
      setError("Failed to load trusted devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRemove = async (deviceId: string) => {
    setRemoving(deviceId);

    try {
      const result = await removeTrustedDevice(deviceId);

      if (!result.success) {
        toast.error(result.error || "Failed to remove device");
        return;
      }

      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      toast.success("Device removed");
    } catch {
      toast.error("Failed to remove device");
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveAll = async () => {
    setRemovingAll(true);

    try {
      const result = await removeAllTrustedDevices();

      if (!result.success) {
        toast.error(result.error || "Failed to remove devices");
        return;
      }

      setDevices([]);
      toast.success("All trusted devices removed");
    } catch {
      toast.error("Failed to remove devices");
    } finally {
      setRemovingAll(false);
      setShowRemoveAll(false);
    }
  };

  const getDeviceIcon = (deviceName: string | null) => {
    const name = deviceName?.toLowerCase() || "";

    if (name.includes("mobile") || name.includes("iphone") || name.includes("android")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (name.includes("ipad") || name.includes("tablet")) {
      return <Tablet className="h-5 w-5" />;
    }
    if (name.includes("chrome") || name.includes("firefox") || name.includes("safari") || name.includes("edge")) {
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

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (devices.length === 0 && !loading && !error) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Trusted Devices</CardTitle>
            </div>
            <div className="flex gap-2">
              {devices.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemoveAll(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDevices}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          <CardDescription>
            Devices that can skip two-factor authentication for 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>{error}</p>
              <Button variant="link" onClick={fetchDevices}>
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
          ) : devices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No trusted devices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 ${
                    device.isCurrent
                      ? "border-primary/20 bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    {getDeviceIcon(device.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {device.name || "Unknown Device"}
                      </span>
                      {device.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{device.ipAddress}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last used: {getRelativeTime(device.lastUsedAt)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(device.id)}
                    disabled={removing === device.id}
                  >
                    {removing === device.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRemoveAll} onOpenChange={setShowRemoveAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all trusted devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will require two-factor authentication on all devices,
              including this one. You&apos;ll need to verify your identity
              again when signing in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAll}
              disabled={removingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingAll ? "Removing..." : "Remove All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
