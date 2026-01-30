"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verify2FAToken, useBackupCode as verifyBackupCode } from "@/server/actions/security/two-factor";

interface TwoFactorVerifyFormProps {
  userId: string;
  callbackUrl: string;
}

export function TwoFactorVerifyForm({
  userId,
  callbackUrl,
}: TwoFactorVerifyFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedCode = code.trim();

    if (useBackup) {
      // Backup code format: XXXX-XXXX
      if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(normalizedCode)) {
        setError("Invalid backup code format");
        return;
      }
    } else {
      // TOTP code: 6 digits
      if (!/^\d{6}$/.test(normalizedCode)) {
        setError("Please enter a 6-digit code");
        return;
      }
    }

    setLoading(true);

    try {
      let result;

      if (useBackup) {
        result = await verifyBackupCode(userId, normalizedCode.toUpperCase());
      } else {
        result = await verify2FAToken(userId, normalizedCode);
      }

      if (!result.success) {
        setError(result.error || "Verification failed");
        return;
      }

      // Verification successful
      toast.success("Verification successful!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {useBackup ? (
            <KeyRound className="h-6 w-6 text-primary" />
          ) : (
            <Shield className="h-6 w-6 text-primary" />
          )}
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          {useBackup
            ? "Enter one of your backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">
              {useBackup ? "Backup Code" : "Verification Code"}
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                if (useBackup) {
                  // Allow format XXXX-XXXX
                  setCode(value.replace(/[^A-Z0-9-]/gi, "").slice(0, 9));
                } else {
                  // Only digits
                  setCode(value.replace(/\D/g, "").slice(0, 6));
                }
              }}
              placeholder={useBackup ? "XXXX-XXXX" : "000000"}
              className="text-center text-2xl tracking-widest"
              maxLength={useBackup ? 9 : 6}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || (useBackup ? code.length < 8 : code.length < 6)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <Button
            type="button"
            variant="link"
            onClick={() => {
              setUseBackup(!useBackup);
              setCode("");
              setError(null);
            }}
            className="text-sm"
          >
            {useBackup
              ? "Use authenticator app instead"
              : "Use a backup code instead"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-primary">
              Back to sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
