"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { cache } from "react";

// ==================== TRACKING ====================

/**
 * Track a page view for a daycare
 */
export async function trackPageView(data: {
  daycareId: string;
  path: string;
  sessionId: string;
  referrer?: string;
  source?: string;
}) {
  try {
    const session = await auth();
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const forwardedFor = headersList.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0].trim() || undefined;

    // Determine device type from user agent
    let deviceType = "desktop";
    if (userAgent) {
      if (/mobile/i.test(userAgent)) deviceType = "mobile";
      else if (/tablet|ipad/i.test(userAgent)) deviceType = "tablet";
    }

    // Determine source from referrer if not provided
    let source = data.source;
    if (!source && data.referrer) {
      if (data.referrer.includes("google.com") || data.referrer.includes("bing.com")) {
        source = "search";
      } else if (data.referrer.includes(process.env.NEXT_PUBLIC_APP_URL || "")) {
        source = "internal";
      } else {
        source = "referral";
      }
    }
    if (!source) source = "direct";

    await db.pageView.create({
      data: {
        daycareId: data.daycareId,
        userId: session?.user?.id,
        sessionId: data.sessionId,
        path: data.path,
        referrer: data.referrer,
        source,
        userAgent,
        ipAddress,
        deviceType,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to track page view:", error);
    return { success: false };
  }
}

/**
 * Track an analytics event
 */
export async function trackEvent(data: {
  daycareId?: string;
  sessionId: string;
  eventType: string;
  eventData?: Record<string, string | number | boolean | null>;
  path?: string;
}) {
  try {
    const session = await auth();

    await db.analyticsEvent.create({
      data: {
        daycareId: data.daycareId,
        userId: session?.user?.id,
        sessionId: data.sessionId,
        eventType: data.eventType,
        eventData: data.eventData ?? undefined,
        path: data.path,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to track event:", error);
    return { success: false };
  }
}

// ==================== PLATFORM ANALYTICS (ADMIN) ====================

/**
 * Get platform-wide analytics for admin dashboard
 */
export const getPlatformAnalytics = cache(async (days: number = 30) => {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - days);

  // Get current period stats
  const [
    currentUsers,
    previousUsers,
    currentDaycares,
    previousDaycares,
    currentBookings,
    previousBookings,
    currentRevenue,
    previousRevenue,
    currentEnrollments,
    previousEnrollments,
  ] = await Promise.all([
    // Current period
    db.user.count({ where: { createdAt: { gte: startDate } } }),
    db.user.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
    db.daycare.count({ where: { createdAt: { gte: startDate }, status: "APPROVED" } }),
    db.daycare.count({ where: { createdAt: { gte: previousStartDate, lt: startDate }, status: "APPROVED" } }),
    db.booking.count({ where: { createdAt: { gte: startDate } } }),
    db.booking.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
    db.payment.aggregate({
      where: { createdAt: { gte: startDate }, status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { createdAt: { gte: previousStartDate, lt: startDate }, status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    db.enrollment.count({ where: { createdAt: { gte: startDate } } }),
    db.enrollment.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
  ]);

  // Calculate changes
  const calculateChange = (current: number, previous: number) =>
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

  // Get totals
  const [
    totalUsers,
    totalDaycares,
    totalBookings,
    activeSubscriptions,
    pendingVerifications,
  ] = await Promise.all([
    db.user.count(),
    db.daycare.count({ where: { status: "APPROVED" } }),
    db.booking.count(),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
  ]);

  // Get booking funnel
  const [
    funnelPageViews,
    funnelContactClicks,
    funnelBookingStarts,
    funnelBookingCompletes,
  ] = await Promise.all([
    db.pageView.count({ where: { createdAt: { gte: startDate } } }),
    db.analyticsEvent.count({
      where: { eventType: "contact_click", createdAt: { gte: startDate } },
    }),
    db.analyticsEvent.count({
      where: { eventType: "booking_started", createdAt: { gte: startDate } },
    }),
    db.booking.count({
      where: { createdAt: { gte: startDate }, status: "CONFIRMED" },
    }),
  ]);

  // Get daily trends
  const dailyStats = await db.$queryRaw<
    Array<{
      date: Date;
      users: bigint;
      bookings: bigint;
      revenue: number;
    }>
  >`
    SELECT
      DATE(u.day) as date,
      COALESCE(u.count, 0) as users,
      COALESCE(b.count, 0) as bookings,
      COALESCE(p.total, 0) as revenue
    FROM generate_series(${startDate}::date, ${now}::date, '1 day') as u(day)
    LEFT JOIN (
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
    ) u ON DATE(u.day) = u.day
    LEFT JOIN (
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "Booking"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
    ) b ON DATE(u.day) = b.day
    LEFT JOIN (
      SELECT DATE("createdAt") as day, SUM(amount) as total
      FROM "Payment"
      WHERE "createdAt" >= ${startDate} AND status = 'SUCCEEDED'
      GROUP BY DATE("createdAt")
    ) p ON DATE(u.day) = p.day
    ORDER BY date
  `;

  // Get top daycares by bookings
  const topDaycares = await db.daycare.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      _count: {
        select: {
          bookings: {
            where: { createdAt: { gte: startDate } },
          },
        },
      },
    },
    orderBy: {
      bookings: { _count: "desc" },
    },
    take: 10,
  });

  // Get user distribution by role
  const usersByRole = await db.user.groupBy({
    by: ["role"],
    _count: true,
  });

  // Get subscription distribution
  const subscriptionsByPlan = await db.subscription.groupBy({
    by: ["plan"],
    where: { status: "ACTIVE" },
    _count: true,
  });

  // Get geographic distribution
  const daycaresByState = await db.daycare.groupBy({
    by: ["state"],
    where: { status: "APPROVED" },
    _count: true,
    orderBy: { _count: { state: "desc" } },
    take: 10,
  });

  return {
    overview: {
      totalUsers,
      totalDaycares,
      totalBookings,
      activeSubscriptions,
      pendingVerifications,
    },
    currentPeriod: {
      newUsers: currentUsers,
      newDaycares: currentDaycares,
      newBookings: currentBookings,
      revenue: Number(currentRevenue._sum.amount || 0),
      enrollments: currentEnrollments,
      changes: {
        users: calculateChange(currentUsers, previousUsers),
        daycares: calculateChange(currentDaycares, previousDaycares),
        bookings: calculateChange(currentBookings, previousBookings),
        revenue: calculateChange(
          Number(currentRevenue._sum.amount || 0),
          Number(previousRevenue._sum.amount || 0)
        ),
        enrollments: calculateChange(currentEnrollments, previousEnrollments),
      },
    },
    funnel: {
      pageViews: funnelPageViews,
      contactClicks: funnelContactClicks,
      bookingStarts: funnelBookingStarts,
      bookingCompletes: funnelBookingCompletes,
      conversionRates: {
        viewToContact: funnelPageViews > 0
          ? ((funnelContactClicks / funnelPageViews) * 100).toFixed(1)
          : "0",
        contactToBooking: funnelContactClicks > 0
          ? ((funnelBookingStarts / funnelContactClicks) * 100).toFixed(1)
          : "0",
        bookingToComplete: funnelBookingStarts > 0
          ? ((funnelBookingCompletes / funnelBookingStarts) * 100).toFixed(1)
          : "0",
        overall: funnelPageViews > 0
          ? ((funnelBookingCompletes / funnelPageViews) * 100).toFixed(2)
          : "0",
      },
    },
    trends: dailyStats.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      users: Number(s.users),
      bookings: Number(s.bookings),
      revenue: Number(s.revenue),
    })),
    topDaycares: topDaycares.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      location: `${d.city}, ${d.state}`,
      bookings: d._count.bookings,
    })),
    distributions: {
      usersByRole: usersByRole.map((r) => ({
        role: r.role,
        count: r._count,
      })),
      subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
        plan: s.plan,
        count: s._count,
      })),
      daycaresByState: daycaresByState.map((s) => ({
        state: s.state,
        count: s._count,
      })),
    },
  };
});

// ==================== DAYCARE ANALYTICS ====================

/**
 * Get analytics for a specific daycare
 */
export const getDaycareAnalytics = cache(async (daycareId: string, days: number = 30) => {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify user has access to this daycare
  const staff = await db.daycareStaff.findFirst({
    where: {
      userId: session.user.id,
      daycareId,
      role: { in: ["owner", "manager"] },
    },
  });

  if (!staff && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Get page views and visitors
  const [pageViews, uniqueVisitors] = await Promise.all([
    db.pageView.count({
      where: { daycareId, createdAt: { gte: startDate } },
    }),
    db.pageView.groupBy({
      by: ["sessionId"],
      where: { daycareId, createdAt: { gte: startDate } },
    }).then((r) => r.length),
  ]);

  // Get traffic sources
  const sourceBreakdown = await db.pageView.groupBy({
    by: ["source"],
    where: { daycareId, createdAt: { gte: startDate } },
    _count: true,
    orderBy: { _count: { source: "desc" } },
  });

  // Get device breakdown
  const deviceBreakdown = await db.pageView.groupBy({
    by: ["deviceType"],
    where: { daycareId, createdAt: { gte: startDate } },
    _count: true,
  });

  // Get daily page views
  const dailyViews = await db.pageView.groupBy({
    by: ["createdAt"],
    where: { daycareId, createdAt: { gte: startDate } },
    _count: true,
    orderBy: { createdAt: "asc" },
  });

  // Get events
  const events = await db.analyticsEvent.groupBy({
    by: ["eventType"],
    where: { daycareId, createdAt: { gte: startDate } },
    _count: true,
  });

  // Get hourly distribution (for peak hours)
  const hourlyViews = await db.$queryRaw<
    Array<{ hour: number; count: bigint }>
  >`
    SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
    FROM "PageView"
    WHERE "daycareId" = ${daycareId} AND "createdAt" >= ${startDate}
    GROUP BY EXTRACT(HOUR FROM "createdAt")
    ORDER BY hour
  `;

  return {
    overview: {
      pageViews,
      uniqueVisitors,
      avgPagesPerVisitor: uniqueVisitors > 0
        ? (pageViews / uniqueVisitors).toFixed(1)
        : "0",
    },
    traffic: {
      sources: sourceBreakdown.map((s) => ({
        source: s.source || "unknown",
        count: s._count,
        percentage: pageViews > 0
          ? Math.round((s._count / pageViews) * 100)
          : 0,
      })),
      devices: deviceBreakdown.map((d) => ({
        device: d.deviceType || "unknown",
        count: d._count,
        percentage: pageViews > 0
          ? Math.round((d._count / pageViews) * 100)
          : 0,
      })),
    },
    events: events.reduce(
      (acc, e) => ({ ...acc, [e.eventType]: e._count }),
      {} as Record<string, number>
    ),
    peakHours: hourlyViews.map((h) => ({
      hour: Number(h.hour),
      views: Number(h.count),
    })),
    dailyViews: dailyViews.map((d) => ({
      date: d.createdAt.toISOString().split("T")[0],
      views: d._count,
    })),
  };
});

// ==================== EXPORT ====================

/**
 * Export analytics data to CSV
 */
export async function exportAnalyticsCSV(
  type: "platform" | "daycare",
  daycareId?: string,
  days: number = 30
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (type === "platform" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  let csvContent = "";

  if (type === "platform") {
    // Platform-wide export
    const [users, daycares, bookings, payments] = await Promise.all([
      db.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          createdAt: true,
          role: true,
        },
      }),
      db.daycare.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          createdAt: true,
          status: true,
          city: true,
          state: true,
        },
      }),
      db.booking.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          createdAt: true,
          status: true,
          type: true,
        },
      }),
      db.payment.findMany({
        where: { createdAt: { gte: startDate }, status: "SUCCEEDED" },
        select: {
          createdAt: true,
          amount: true,
        },
      }),
    ]);

    csvContent = "Date,New Users,New Daycares,Bookings,Revenue\n";

    // Group by date
    const dateMap = new Map<string, { users: number; daycares: number; bookings: number; revenue: number }>();

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dateMap.set(dateStr, { users: 0, daycares: 0, bookings: 0, revenue: 0 });
    }

    users.forEach((u) => {
      const dateStr = u.createdAt.toISOString().split("T")[0];
      const entry = dateMap.get(dateStr);
      if (entry) entry.users++;
    });

    daycares.forEach((d) => {
      const dateStr = d.createdAt.toISOString().split("T")[0];
      const entry = dateMap.get(dateStr);
      if (entry) entry.daycares++;
    });

    bookings.forEach((b) => {
      const dateStr = b.createdAt.toISOString().split("T")[0];
      const entry = dateMap.get(dateStr);
      if (entry) entry.bookings++;
    });

    payments.forEach((p) => {
      const dateStr = p.createdAt.toISOString().split("T")[0];
      const entry = dateMap.get(dateStr);
      if (entry) entry.revenue += Number(p.amount);
    });

    dateMap.forEach((value, date) => {
      csvContent += `${date},${value.users},${value.daycares},${value.bookings},${value.revenue}\n`;
    });
  } else if (daycareId) {
    // Daycare-specific export
    const [pageViews, bookings] = await Promise.all([
      db.pageView.findMany({
        where: { daycareId, createdAt: { gte: startDate } },
        select: {
          createdAt: true,
          source: true,
          deviceType: true,
        },
      }),
      db.booking.findMany({
        where: { daycareId, createdAt: { gte: startDate } },
        select: {
          createdAt: true,
          status: true,
          type: true,
        },
      }),
    ]);

    csvContent = "Date,Page Views,Unique Sources,Bookings,Confirmed\n";

    const dateMap = new Map<string, { views: number; bookings: number; confirmed: number }>();

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dateMap.set(dateStr, { views: 0, bookings: 0, confirmed: 0 });
    }

    pageViews.forEach((pv) => {
      const dateStr = pv.createdAt.toISOString().split("T")[0];
      const entry = dateMap.get(dateStr);
      if (entry) entry.views++;
    });

    bookings.forEach((b) => {
      const dateStr = b.createdAt.toISOString().split("T")[0];
      const entry = dateMap.get(dateStr);
      if (entry) {
        entry.bookings++;
        if (b.status === "CONFIRMED") entry.confirmed++;
      }
    });

    dateMap.forEach((value, date) => {
      csvContent += `${date},${value.views},${value.bookings},${value.confirmed}\n`;
    });
  }

  return {
    success: true,
    csv: csvContent,
    filename: `analytics-${type}-${new Date().toISOString().split("T")[0]}.csv`,
  };
}
