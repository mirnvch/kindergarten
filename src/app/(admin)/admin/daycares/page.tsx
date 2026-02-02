import Link from "next/link";
import {
  Search,
  Filter,
  Building2,
  MapPin,
  Clock,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { ProviderActions } from "@/components/admin/provider-actions";
import { ProviderStatus } from "@prisma/client";
import {
  adminProvidersSearchSchema,
  parseSearchParams,
  type AdminProvidersSearch,
} from "@/lib/validations";
import { buildPaginationUrl } from "@/lib/url-helpers";

async function getProviders(params: AdminProvidersSearch) {
  const { page, perPage, search, status } = params;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [providers, total, statusCounts] = await Promise.all([
    db.provider.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        city: true,
        state: true,
        status: true,
        isFeatured: true,
        isVerified: true,
        specialty: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
            reviews: true,
          },
        },
      },
    }),
    db.provider.count({ where }),
    db.provider.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const counts = {
    total: 0,
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };

  statusCounts.forEach((item: { status: ProviderStatus; _count: { status: number } }) => {
    counts[item.status] = item._count.status;
    counts.total += item._count.status;
  });

  return {
    providers,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    counts,
  };
}

function getStatusBadgeVariant(status: ProviderStatus) {
  switch (status) {
    case "APPROVED":
      return "default";
    case "PENDING":
      return "secondary";
    case "REJECTED":
      return "outline";
    case "SUSPENDED":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusColor(status: ProviderStatus) {
  switch (status) {
    case "APPROVED":
      return "text-green-600";
    case "PENDING":
      return "text-yellow-600";
    case "REJECTED":
      return "text-gray-600";
    case "SUSPENDED":
      return "text-red-600";
    default:
      return "";
  }
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseSearchParams(adminProvidersSearchSchema, rawParams);
  const { providers, total, page, totalPages, counts } = await getProviders(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Providers</h1>
          <p className="text-muted-foreground">
            Manage and moderate provider listings
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
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={params.status === "PENDING" ? "ring-2 ring-yellow-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/providers?status=PENDING" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{counts.PENDING}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "APPROVED" ? "ring-2 ring-green-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/providers?status=APPROVED" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{counts.APPROVED}</p>
                </div>
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "REJECTED" ? "ring-2 ring-gray-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/providers?status=REJECTED" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-gray-600">{counts.REJECTED}</p>
                </div>
                <Building2 className="h-8 w-8 text-gray-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "SUSPENDED" ? "ring-2 ring-red-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/providers?status=SUSPENDED" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-bold text-red-600">{counts.SUSPENDED}</p>
                </div>
                <Building2 className="h-8 w-8 text-red-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <form className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search providers..."
                  defaultValue={params.search ?? ""}
                  className="pl-10"
                />
              </div>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              {(params.search || params.status) && (
                <Button variant="ghost" asChild>
                  <Link href="/admin/providers">Clear</Link>
                </Button>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Appointments</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No providers found
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{provider.name}</p>
                            {provider.isFeatured && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                            {provider.isVerified && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {provider.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {provider.city}, {provider.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(provider.status)}
                        className={getStatusColor(provider.status)}
                      >
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{provider.specialty || "-"}</TableCell>
                    <TableCell>{provider._count.appointments}</TableCell>
                    <TableCell>{provider._count.reviews}</TableCell>
                    <TableCell>
                      {new Date(provider.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ProviderActions
                        providerId={provider.id}
                        providerSlug={provider.slug}
                        status={provider.status}
                        isFeatured={provider.isFeatured}
                      />
                    </TableCell>
                  </TableRow>
                ))
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  asChild
                >
                  <Link
                    href={buildPaginationUrl("/admin/providers", page - 1, {
                      search: params.search,
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
                    href={buildPaginationUrl("/admin/providers", page + 1, {
                      search: params.search,
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
