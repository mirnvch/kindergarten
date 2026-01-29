import { Suspense } from "react";
import { ClipboardList, Bell, UserX, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getWaitlistForDaycare } from "@/server/actions/waitlist";
import { WaitlistTable } from "@/components/portal/waitlist-table";

export const metadata = {
  title: "Waitlist | Provider Portal",
  description: "Manage your daycare waitlist",
};

async function WaitlistStats() {
  const data = await getWaitlistForDaycare();

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Waitlist</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.stats.active}</div>
          <p className="text-xs text-muted-foreground">Families waiting</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notified</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.stats.notified}</div>
          <p className="text-xs text-muted-foreground">Awaiting response</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.stats.total}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
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

async function WaitlistContent({ showNotified }: { showNotified: boolean }) {
  const data = await getWaitlistForDaycare();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UserX className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No access</h3>
        <p className="text-muted-foreground">
          You don&apos;t have access to the waitlist.
        </p>
      </div>
    );
  }

  const entries = showNotified
    ? data.entries.filter((e) => e.notifiedAt)
    : data.entries.filter((e) => !e.notifiedAt);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          {showNotified ? "No notified entries" : "Waitlist is empty"}
        </h3>
        <p className="text-muted-foreground">
          {showNotified
            ? "No families have been notified about available spots yet."
            : "No families are currently on the waitlist."}
        </p>
      </div>
    );
  }

  return <WaitlistTable entries={entries} showNotified={showNotified} />;
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function PortalWaitlistPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Waitlist</h1>
        <p className="text-muted-foreground">
          Manage families waiting for available spots
        </p>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <WaitlistStats />
      </Suspense>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="notified">Notified</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Suspense fallback={<ContentSkeleton />}>
            <WaitlistContent showNotified={false} />
          </Suspense>
        </TabsContent>

        <TabsContent value="notified">
          <Suspense fallback={<ContentSkeleton />}>
            <WaitlistContent showNotified={true} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
