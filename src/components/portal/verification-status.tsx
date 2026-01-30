"use client";

import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VerificationRequest {
  id: string;
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  licenseNumber: string | null;
  licenseState: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}

interface VerificationStatusProps {
  isVerified: boolean;
  latestRequest?: VerificationRequest | null;
}

const statusConfig = {
  PENDING: {
    label: "Pending Review",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-yellow-500",
  },
  IN_REVIEW: {
    label: "Under Review",
    icon: AlertCircle,
    variant: "outline" as const,
    color: "text-blue-500",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    variant: "default" as const,
    color: "text-green-500",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-500",
  },
};

export function VerificationStatus({
  isVerified,
  latestRequest,
}: VerificationStatusProps) {
  if (isVerified) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle className="text-green-700 dark:text-green-400">
                Verified Daycare
              </CardTitle>
              <CardDescription>
                Your daycare is verified and trusted by parents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your verification badge is displayed on your listing, helping
            parents find quality childcare.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!latestRequest) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle>Not Verified</CardTitle>
              <CardDescription>
                Submit your documents to get verified
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete the verification form below to submit your daycare license
            and documents for review.
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[latestRequest.status];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-8 w-8 ${config.color}`} />
            <div>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>
                Request submitted on{" "}
                {new Date(latestRequest.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">License Number</p>
            <p className="font-medium">{latestRequest.licenseNumber || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">License State</p>
            <p className="font-medium">{latestRequest.licenseState || "—"}</p>
          </div>
        </div>

        {latestRequest.status === "REJECTED" && latestRequest.rejectionReason && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Rejection Reason
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
              {latestRequest.rejectionReason}
            </p>
          </div>
        )}

        {latestRequest.status === "PENDING" && (
          <p className="text-sm text-muted-foreground">
            Your verification request is in the queue. We typically review
            submissions within 2-3 business days.
          </p>
        )}

        {latestRequest.status === "IN_REVIEW" && (
          <p className="text-sm text-muted-foreground">
            An admin is currently reviewing your documents. You will be notified
            once the review is complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
