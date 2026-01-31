"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAnalyticsCSV } from "@/server/actions/analytics";
import { toast } from "sonner";

interface ExportAnalyticsButtonProps {
  type: "platform" | "daycare";
  daycareId?: string;
  days?: number;
}

export function ExportAnalyticsButton({
  type,
  daycareId,
  days = 30,
}: ExportAnalyticsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleExport() {
    setIsLoading(true);
    try {
      const result = await exportAnalyticsCSV(type, daycareId, days);

      if (result.success && result.csv) {
        // Create blob and download
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Export downloaded successfully");
      } else {
        toast.error("Failed to export data");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
