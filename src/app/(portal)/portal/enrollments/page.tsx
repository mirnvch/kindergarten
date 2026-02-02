import { Suspense } from "react";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPortalEnrollments,
  getPortalEnrollmentStats,
  type PortalEnrollmentFilter,
} from "@/server/actions/portal-enrollments";
import { EnrollmentCard } from "@/components/portal/enrollment-card";

export const metadata = {
  title: "Enrollments | Provider Portal",
  description: "Manage child enrollments at your daycare",
};

async function EnrollmentStats() {
  const stats = await getPortalEnrollmentStats();

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active}</div>
          <p className="text-xs text-muted-foreground">Currently enrolled</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completed}</div>
          <p className="text-xs text-muted-foreground">Past enrollments</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.cancelled}</div>
          <p className="text-xs text-muted-foreground">Cancelled enrollments</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function EnrollmentList({ filter }: { filter: PortalEnrollmentFilter }) {
  const enrollments = await getPortalEnrollments(filter);

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No enrollments found</h3>
        <p className="text-muted-foreground">
          {filter === "pending"
            ? "You don't have any pending enrollment requests."
            : filter === "active"
              ? "You don't have any active enrollments."
              : filter === "completed"
                ? "No completed enrollments to show."
                : "No cancelled enrollments to show."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => (
        <EnrollmentCard
          key={enrollment.id}
          enrollment={enrollment}
          showActions={filter === "pending" || filter === "active"}
        />
      ))}
    </div>
  );
}

function EnrollmentListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PortalEnrollmentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Enrollments</h1>
        <p className="text-muted-foreground">
          Manage child enrollments at your daycare
        </p>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <EnrollmentStats />
      </Suspense>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Suspense fallback={<EnrollmentListSkeleton />}>
            <EnrollmentList filter="pending" />
          </Suspense>
        </TabsContent>

        <TabsContent value="active">
          <Suspense fallback={<EnrollmentListSkeleton />}>
            <EnrollmentList filter="active" />
          </Suspense>
        </TabsContent>

        <TabsContent value="completed">
          <Suspense fallback={<EnrollmentListSkeleton />}>
            <EnrollmentList filter="completed" />
          </Suspense>
        </TabsContent>

        <TabsContent value="cancelled">
          <Suspense fallback={<EnrollmentListSkeleton />}>
            <EnrollmentList filter="cancelled" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
