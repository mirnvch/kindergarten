"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  initiate2FASetup,
  verify2FASetup,
} from "@/server/actions/security/two-factor";

export default function AdminSetup2FAPage() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "setup" | "backup">("intro");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const result = await initiate2FASetup();

      if (!result.success) {
        toast.error(result.error || "Failed to start 2FA setup");
        return;
      }

      setQrCode(result.data!.qrCode);
      setSecret(result.data!.secret);
      setStep("setup");
    } catch {
      toast.error("Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const result = await verify2FASetup(verifyCode);

      if (!result.success) {
        toast.error(result.error || "Invalid code");
        return;
      }

      setBackupCodes(result.data!.backupCodes);
      setStep("backup");
      toast.success("Two-factor authentication enabled!");
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleComplete = () => {
    router.push("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        {step === "intro" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">
                Two-Factor Authentication Required
              </CardTitle>
              <CardDescription className="text-base">
                As an administrator, you must enable two-factor authentication
                to access the admin panel. This helps protect sensitive data and
                operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Before you continue:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Download an authenticator app (Google Authenticator, Authy, 1Password)</li>
                  <li>Make sure you can scan a QR code or enter a secret key</li>
                </ul>
              </div>
              <Button
                onClick={handleStartSetup}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Starting..." : "Set Up 2FA"}
              </Button>
            </CardContent>
          </>
        )}

        {step === "setup" && (
          <>
            <CardHeader className="text-center">
              <CardTitle>Scan QR Code</CardTitle>
              <CardDescription>
                Open your authenticator app and scan this QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {qrCode && (
                <div className="flex justify-center rounded-lg bg-white p-4 border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="h-48 w-48"
                  />
                </div>
              )}

              {secret && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Or enter this code manually:
                  </Label>
                  <div className="flex gap-2">
                    <code className="flex-1 rounded bg-muted p-2 text-xs font-mono break-all">
                      {secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copySecret}
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="verify-code">
                  Enter the 6-digit code from your app
                </Label>
                <Input
                  id="verify-code"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading || verifyCode.length !== 6}
                className="w-full"
                size="lg"
              >
                {loading ? "Verifying..." : "Verify & Enable"}
              </Button>
            </CardContent>
          </>
        )}

        {step === "backup" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Save Your Backup Codes</CardTitle>
              <CardDescription>
                Store these codes in a safe place. You can use them to sign in
                if you lose access to your authenticator app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes?.map((code, i) => (
                    <div
                      key={i}
                      className="rounded bg-background p-2 text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={copyBackupCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All Codes
                  </>
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Each code can only be used once. Keep them safe!
              </p>

              <Button
                onClick={handleComplete}
                className="w-full"
                size="lg"
              >
                Continue to Admin Panel
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
