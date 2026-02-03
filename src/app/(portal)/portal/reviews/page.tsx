import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { ReviewResponseForm } from "@/components/portal/review-response-form";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = {
  title: "Reviews | DocConnect Portal",
  description: "Manage your daycare reviews",
};

const REVIEWS_PER_PAGE = 10;

async function getReviews(userId: string, page: number = 1) {
  const providerStaff = await db.providerStaff.findFirst({
    where: { userId, role: { in: ["owner", "manager"] } },
    include: { provider: true },
  });

  if (!providerStaff) {
    return null;
  }

  const providerId = providerStaff.provider.id;

  // Get paginated reviews and stats in parallel
  const [reviews, totalCount, statsData] = await Promise.all([
    db.review.findMany({
      where: { providerId, isApproved: true },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * REVIEWS_PER_PAGE,
      take: REVIEWS_PER_PAGE,
    }),
    db.review.count({
      where: { providerId, isApproved: true },
    }),
    db.review.aggregate({
      where: { providerId, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  // Get responded count separately (aggregate doesn't support conditional counts well)
  const respondedCount = await db.review.count({
    where: { providerId, isApproved: true, response: { not: null } },
  });

  const avgRating = statsData._avg.rating || 0;

  return {
    daycare: providerStaff.provider,
    reviews,
    pagination: {
      page,
      totalPages: Math.ceil(totalCount / REVIEWS_PER_PAGE),
      total: totalCount,
    },
    stats: {
      total: totalCount,
      avgRating: Math.round(avgRating * 10) / 10,
      responded: respondedCount,
      pending: totalCount - respondedCount,
    },
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PortalReviewsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  const data = await getReviews(session.user.id, page);

  if (!data) {
    redirect("/portal");
  }

  const { daycare, reviews, pagination, stats } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          Manage and respond to reviews for {daycare.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {stats.avgRating}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.responded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No reviews yet</h3>
            <p className="text-sm text-muted-foreground">
              Reviews from parents will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(review.user.firstName, review.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {review.user.firstName} {review.user.lastName.charAt(0)}.
                          </span>
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {review.title && (
                        <h4 className="font-medium">{review.title}</h4>
                      )}
                      {review.content && (
                        <p className="text-muted-foreground mt-1">{review.content}</p>
                      )}

                      {/* Response section */}
                      <div className="mt-4 pt-4 border-t">
                        <ReviewResponseForm
                          reviewId={review.id}
                          existingResponse={review.response}
                          respondedAt={review.respondedAt}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            basePath="/portal/reviews"
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
