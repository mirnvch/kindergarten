import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { VerificationStatus } from "@/components/portal/verification-status";
import { VerificationForm } from "@/components/portal/verification-form";

export const metadata: Metadata = {
  title: "Verification | DocConnect Portal",
  description: "Get your daycare verified",
};

async function getDaycareWithVerification(userId: string) {
  const providerStaff = await db.providerStaff.findFirst({
    where: { userId, role: "owner", isActive: true },
    include: {
      daycare: {
        select: {
          id: true,
          name: true,
          isVerified: true,
          verificationRequests: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              documents: true,
            },
          },
        },
      },
    },
  });

  return providerStaff?.daycare;
}

export default async function VerificationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const daycare = await getDaycareWithVerification(session.user.id);

  if (!daycare) {
    redirect("/portal/daycare/setup");
  }

  const latestRequest = daycare.verificationRequests[0];
  const canSubmitRequest = !latestRequest ||
    (latestRequest.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verification</h1>
        <p className="text-muted-foreground">
          Get your daycare verified to build trust with parents
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Status */}
        <VerificationStatus
          isVerified={daycare.isVerified}
          latestRequest={latestRequest}
        />

        {/* Benefits */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Benefits of Verification</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Display a verified badge on your listing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Build trust with parents looking for quality care</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Higher visibility in search results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Demonstrate compliance with licensing requirements</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Verification Form */}
      {canSubmitRequest && !daycare.isVerified && (
        <VerificationForm providerId={daycare.id} />
      )}

      {/* Requirements Info */}
      <div className="rounded-lg border bg-muted/50 p-6">
        <h3 className="font-semibold mb-4">Verification Requirements</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-sm mb-2">Required Documents</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Valid daycare license</li>
              <li>• Business insurance certificate</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Optional Documents</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Staff background check certificates</li>
              <li>• Health and safety inspection reports</li>
              <li>• Accreditation certificates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
