import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { ConnectAccountButton } from "@/components/billing/connect-account-button";
import { getConnectAccountStatus } from "@/server/actions/stripe";

export const metadata: Metadata = {
  title: "Payments | DocConnect Portal",
  description: "Manage your payment settings and receive payments",
};

export default async function PaymentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get daycare
  const providerStaff = await db.providerStaff.findFirst({
    where: {
      userId: session.user.id,
      role: "owner",
    },
    include: {
      daycare: true,
    },
  });

  if (!providerStaff) {
    redirect("/portal");
  }

  const daycare = providerStaff.daycare;
  const accountStatus = await getConnectAccountStatus();

  // Get payment stats
  const [totalReceived, pendingPayments, thisMonthRevenue] = await Promise.all([
    db.payment.aggregate({
      where: {
        providerId: daycare.id,
        status: "SUCCEEDED",
        type: { not: "subscription" },
      },
      _sum: { netAmount: true },
    }),
    db.payment.count({
      where: {
        providerId: daycare.id,
        status: "PENDING",
      },
    }),
    db.payment.aggregate({
      where: {
        providerId: daycare.id,
        status: "SUCCEEDED",
        type: { not: "subscription" },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { netAmount: true },
    }),
  ]);

  const isOnboarded = accountStatus.configured && accountStatus.chargesEnabled && accountStatus.payoutsEnabled;
  const isPartiallySetup = accountStatus.configured && !isOnboarded;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">
          Set up payments to receive money from parents
        </p>
      </div>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Account</CardTitle>
              <CardDescription>
                Connect your bank account to receive payments
              </CardDescription>
            </div>
            {isOnboarded ? (
              <Badge className="bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            ) : isPartiallySetup ? (
              <Badge variant="secondary">
                <Clock className="mr-1 h-3 w-3" />
                Setup Incomplete
              </Badge>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isOnboarded ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Your account is ready</AlertTitle>
                <AlertDescription>
                  You can receive payments from parents. Funds will be deposited to your connected bank account.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <ConnectAccountButton variant="outline">
                  Manage Account
                </ConnectAccountButton>
              </div>
            </div>
          ) : isPartiallySetup ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Setup incomplete</AlertTitle>
                <AlertDescription>
                  Please complete your account setup to start receiving payments.
                </AlertDescription>
              </Alert>
              <ConnectAccountButton>
                Complete Setup
              </ConnectAccountButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Start accepting payments</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your bank account to receive payments for enrollments, tuition, and more.
                  </p>
                </div>
              </div>
              <ConnectAccountButton>
                Set Up Payments
              </ConnectAccountButton>
              <p className="text-xs text-muted-foreground">
                Powered by Stripe. Your financial information is secure and encrypted.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Stats */}
      {isOnboarded && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Number(totalReceived._sum.netAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Number(thisMonthRevenue._sum.netAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleString("default", { month: "long" })} revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayments}</div>
              <p className="text-xs text-muted-foreground">
                Payments processing
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* How It Works */}
      {!isOnboarded && (
        <Card>
          <CardHeader>
            <CardTitle>How Payments Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Connect Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Set up your Stripe account and connect your bank
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Receive Payments</h4>
                  <p className="text-sm text-muted-foreground">
                    Parents pay for enrollments and tuition through the platform
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Get Paid</h4>
                  <p className="text-sm text-muted-foreground">
                    Funds are deposited to your bank automatically
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
