import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerificationReviewForm } from "@/components/admin/verification-review-form";
import { VerificationStatus } from "@prisma/client";

async function getVerificationRequest(id: string) {
  return db.verificationRequest.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          isVerified: true,
          status: true,
          createdAt: true,
        },
      },
      documents: true,
    },
  });
}

function getStatusConfig(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return {
        label: "Approved",
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50 dark:bg-green-950",
        border: "border-green-200 dark:border-green-900",
      };
    case "PENDING":
      return {
        label: "Pending",
        icon: Clock,
        color: "text-yellow-600",
        bg: "bg-yellow-50 dark:bg-yellow-950",
        border: "border-yellow-200 dark:border-yellow-900",
      };
    case "IN_REVIEW":
      return {
        label: "In Review",
        icon: AlertCircle,
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950",
        border: "border-blue-200 dark:border-blue-900",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50 dark:bg-red-950",
        border: "border-red-200 dark:border-red-900",
      };
    default:
      return {
        label: status,
        icon: Clock,
        color: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
      };
  }
}

function getDocumentTypeLabel(type: string) {
  switch (type) {
    case "license":
      return "Medical License";
    case "insurance":
      return "Insurance Certificate";
    case "background_check":
      return "Background Check";
    case "npi":
      return "NPI Verification";
    case "board_certification":
      return "Board Certification";
    default:
      return "Other Document";
  }
}

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const { id } = await params;
  const request = await getVerificationRequest(id);

  if (!request) {
    notFound();
  }

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;
  const canReview = request.status === "PENDING" || request.status === "IN_REVIEW";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/verifications">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Verification Request</h1>
          <p className="text-muted-foreground">
            Submitted on {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge
          className={`flex items-center gap-1 ${statusConfig.color}`}
          variant="outline"
        >
          <StatusIcon className="h-4 w-4" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Provider Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Provider Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {request.provider.name}
                  {request.provider.isVerified && (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  )}
                </h3>
                <Link
                  href={`/provider/${request.provider.slug}`}
                  target="_blank"
                  className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
                >
                  View listing
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <Badge
                variant={
                  request.provider.status === "APPROVED" ? "default" : "secondary"
                }
              >
                {request.provider.status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {request.provider.address}, {request.provider.city},{" "}
                  {request.provider.state} {request.provider.zipCode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{request.provider.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{request.provider.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Registered:{" "}
                  {new Date(request.provider.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-medium">{request.licenseNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License State</p>
                <p className="font-medium">{request.licenseState || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiry Date</p>
                <p className="font-medium">
                  {request.licenseExpiry
                    ? new Date(request.licenseExpiry).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="font-medium">{request.documents.length} file(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            Review the documents submitted for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {request.documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No documents uploaded
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {request.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDocumentTypeLabel(doc.type)}
                      {doc.size && ` • ${(doc.size / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Status / History */}
      {(request.reviewedAt || request.rejectionReason) && (
        <Card className={`${statusConfig.bg} ${statusConfig.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
              Review Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.reviewedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Reviewed On</p>
                <p className="font-medium">
                  {new Date(request.reviewedAt).toLocaleString()}
                </p>
              </div>
            )}
            {request.reviewNotes && (
              <div>
                <p className="text-sm text-muted-foreground">Review Notes</p>
                <p className="font-medium">{request.reviewNotes}</p>
              </div>
            )}
            {request.rejectionReason && (
              <div>
                <p className="text-sm text-muted-foreground">Rejection Reason</p>
                <p className="font-medium text-red-600">
                  {request.rejectionReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {canReview && (
        <VerificationReviewForm
          requestId={request.id}
          status={request.status}
        />
      )}
    </div>
  );
}
