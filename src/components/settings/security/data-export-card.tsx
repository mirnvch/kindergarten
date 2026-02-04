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
import { Download, FileJson, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  requestDataExport,
  getDataExportStatus,
  type DataExportStatus,
} from "@/server/actions/security/data-export";

export function DataExportCard() {
  const [exportStatus, setExportStatus] = useState<DataExportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);

    try {
      const result = await getDataExportStatus();

      if (result.success) {
        setExportStatus(result.data || null);
      }
    } catch {
      console.error("Failed to fetch export status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRequestExport = async () => {
    setRequesting(true);

    try {
      const result = await requestDataExport();

      if (!result.success) {
        toast.error(result.error || "Failed to request export");
        return;
      }

      toast.success("Data export requested! You'll receive an email when it's ready.");
      fetchStatus();
    } catch {
      toast.error("Failed to request export");
    } finally {
      setRequesting(false);
    }
  };

  const handleDownload = () => {
    if (exportStatus?.fileUrl) {
      // For data URLs, create a download link
      const link = document.createElement("a");
      link.href = exportStatus.fileUrl;
      link.download = `docconnect-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return null;
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

  const isExpired =
    exportStatus?.expiresAt && new Date(exportStatus.expiresAt) < new Date();

  const canRequest =
    !exportStatus ||
    exportStatus.status === "COMPLETED" ||
    exportStatus.status === "FAILED" ||
    isExpired;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Download Your Data</CardTitle>
        </div>
        <CardDescription>
          Get a copy of all your personal data stored in DocConnect (GDPR
          compliance)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : exportStatus && !isExpired ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Data Export</span>
                  {getStatusBadge(exportStatus.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Requested on {formatDate(exportStatus.requestedAt)}
                </p>
                {exportStatus.expiresAt && exportStatus.status === "COMPLETED" && (
                  <p className="text-xs text-muted-foreground">
                    Expires on {formatDate(exportStatus.expiresAt)}
                  </p>
                )}
              </div>

              {exportStatus.status === "COMPLETED" && exportStatus.fileUrl && (
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <p>Your export will include:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Profile information</li>
              <li>Children profiles</li>
              <li>Bookings and appointments</li>
              <li>Messages</li>
              <li>Reviews</li>
              <li>Saved searches and favorites</li>
              <li>Login history</li>
            </ul>
          </div>

          {canRequest && (
            <Button
              onClick={handleRequestExport}
              disabled={requesting}
              variant={exportStatus ? "outline" : "default"}
            >
              {requesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {exportStatus ? "Request New Export" : "Request Data Export"}
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Exports are available for 7 days. You can request one export per
            day.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
