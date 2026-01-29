import Link from "next/link";
import { Search, Filter, Star, CheckCircle, XCircle, BadgeCheck } from "lucide-react";
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
import { ReviewActions } from "@/components/admin/review-actions";

interface SearchParams {
  search?: string;
  status?: string;
  rating?: string;
  page?: string;
}

async function getReviews(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: "insensitive" } },
      { content: { contains: searchParams.search, mode: "insensitive" } },
      { daycare: { name: { contains: searchParams.search, mode: "insensitive" } } },
    ];
  }

  if (searchParams.status === "approved") {
    where.isApproved = true;
  } else if (searchParams.status === "rejected") {
    where.isApproved = false;
  } else if (searchParams.status === "verified") {
    where.isVerified = true;
  }

  if (searchParams.rating) {
    where.rating = parseInt(searchParams.rating);
  }

  const [reviews, total, stats] = await Promise.all([
    db.review.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        daycare: { select: { name: true, slug: true } },
      },
    }),
    db.review.count({ where }),
    db.review.groupBy({
      by: ["isApproved"],
      _count: { isApproved: true },
    }),
  ]);

  const approvedCount = stats.find((s) => s.isApproved === true)?._count.isApproved || 0;
  const rejectedCount = stats.find((s) => s.isApproved === false)?._count.isApproved || 0;

  return {
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    approvedCount,
    rejectedCount,
  };
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { reviews, total, page, totalPages, approvedCount, rejectedCount } =
    await getReviews(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">
            Moderate user reviews ({total} total)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={params.status === undefined ? "ring-2 ring-primary" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/reviews" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "approved" ? "ring-2 ring-green-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/reviews?status=approved" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "rejected" ? "ring-2 ring-red-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/reviews?status=rejected" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
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
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search reviews..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
              <select
                name="status"
                defaultValue={params.status}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="verified">Verified</option>
              </select>
              <select
                name="rating"
                defaultValue={params.rating}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              {(params.search || params.status || params.rating) && (
                <Button variant="ghost" asChild>
                  <Link href="/admin/reviews">Clear</Link>
                </Button>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Review</TableHead>
                <TableHead>Daycare</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No reviews found
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {review.user.firstName} {review.user.lastName}
                          </p>
                          {review.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        {review.title && (
                          <p className="text-sm font-medium mt-1">{review.title}</p>
                        )}
                        {review.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {review.content}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/daycare/${review.daycare.slug}`}
                        className="text-sm hover:underline"
                        target="_blank"
                      >
                        {review.daycare.name}
                      </Link>
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell>
                      {review.isApproved ? (
                        <Badge variant="outline" className="text-green-600">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ReviewActions
                        reviewId={review.id}
                        daycareSlug={review.daycare.slug}
                        isApproved={review.isApproved}
                        isVerified={review.isVerified}
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
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} asChild>
                  <Link
                    href={`/admin/reviews?page=${page - 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.status ? `&status=${params.status}` : ""}${
                      params.rating ? `&rating=${params.rating}` : ""
                    }`}
                  >
                    Previous
                  </Link>
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} asChild>
                  <Link
                    href={`/admin/reviews?page=${page + 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.status ? `&status=${params.status}` : ""}${
                      params.rating ? `&rating=${params.rating}` : ""
                    }`}
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
