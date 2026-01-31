import Link from "next/link";
import {
  Filter,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { VerificationStatus } from "@prisma/client";
import { VerificationActions } from "@/components/admin/verification-actions";
import {
  adminVerificationsSearchSchema,
  parseSearchParams,
  type AdminVerificationsSearch,
} from "@/lib/validations";
import { buildPaginationUrl } from "@/lib/url-helpers";

async function getVerificationRequests(params: AdminVerificationsSearch) {
  const { page, perPage, status } = params;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  const [requests, total, statusCounts] = await Promise.all([
    db.verificationRequest.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: {
        daycare: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            isVerified: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
      },
    }),
    db.verificationRequest.count({ where }),
    db.verificationRequest.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const counts = {
    total: 0,
    PENDING: 0,
    IN_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  };

  statusCounts.forEach((item) => {
    counts[item.status] = item._count.status;
    counts.total += item._count.status;
  });

  return {
    requests,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    counts,
  };
}

function getStatusBadgeVariant(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return "default" as const;
    case "PENDING":
      return "secondary" as const;
    case "IN_REVIEW":
      return "outline" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function getStatusIcon(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return CheckCircle2;
    case "PENDING":
      return Clock;
    case "IN_REVIEW":
      return AlertCircle;
    case "REJECTED":
      return XCircle;
    default:
      return Clock;
  }
}

function getStatusColor(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return "text-green-600";
    case "PENDING":
      return "text-yellow-600";
    case "IN_REVIEW":
      return "text-blue-600";
    case "REJECTED":
      return "text-red-600";
    default:
      return "";
  }
}

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseSearchParams(adminVerificationsSearchSchema, rawParams);
  const { requests, total, page, totalPages, counts } =
    await getVerificationRequests(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verifications</h1>
          <p className="text-muted-foreground">
            Review and approve daycare verification requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{counts.total}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={
            params.status === "PENDING" ? "ring-2 ring-yellow-500" : ""
          }
        >
          <CardContent className="pt-6">
            <Link href="/admin/verifications?status=PENDING" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {counts.PENDING}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card
          className={
            params.status === "IN_REVIEW" ? "ring-2 ring-blue-500" : ""
          }
        >
          <CardContent className="pt-6">
            <Link
              href="/admin/verifications?status=IN_REVIEW"
              className="block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Review</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {counts.IN_REVIEW}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card
          className={
            params.status === "APPROVED" ? "ring-2 ring-green-500" : ""
          }
        >
          <CardContent className="pt-6">
            <Link href="/admin/verifications?status=APPROVED" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {counts.APPROVED}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card
          className={params.status === "REJECTED" ? "ring-2 ring-red-500" : ""}
        >
          <CardContent className="pt-6">
            <Link href="/admin/verifications?status=REJECTED" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {counts.REJECTED}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <form className="flex-1 flex gap-2">
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              {params.status && (
                <Button variant="ghost" asChild>
                  <Link href="/admin/verifications">Clear</Link>
                </Button>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Daycare</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No verification requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => {
                  const StatusIcon = getStatusIcon(request.status);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {request.daycare.name}
                              </p>
                              {request.daycare.isVerified && (
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <Link
                              href={`/daycare/${request.daycare.slug}`}
                              target="_blank"
                              className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                            >
                              View listing
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {request.daycare.city}, {request.daycare.state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{request.licenseNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.licenseState}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.documents.length} doc(s)
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(request.status)}
                          className={`flex items-center gap-1 w-fit ${getStatusColor(
                            request.status
                          )}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {request.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <VerificationActions
                          requestId={request.id}
                          status={request.status}
                          daycareId={request.daycare.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} asChild>
                  <Link
                    href={buildPaginationUrl("/admin/verifications", page - 1, {
                      status: params.status,
                    })}
                  >
                    Previous
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  asChild
                >
                  <Link
                    href={buildPaginationUrl("/admin/verifications", page + 1, {
                      status: params.status,
                    })}
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
