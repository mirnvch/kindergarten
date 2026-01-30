"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ShieldCheck, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  initiate2FASetup,
  verify2FASetup,
  disable2FA,
  regenerateBackupCodes,
} from "@/server/actions/security/two-factor";

interface TwoFactorSetupProps {
  enabled: boolean;
  verifiedAt: Date | null;
  backupCodesRemaining: number;
}

export function TwoFactorSetup({
  enabled,
  verifiedAt,
  backupCodesRemaining,
}: TwoFactorSetupProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Setup state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Disable state
  const [disableCode, setDisableCode] = useState("");

  // Regenerate state
  const [regenerateCode, setRegenerateCode] = useState("");

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
      setIsEnabling(true);
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
      toast.success("Two-factor authentication enabled!");
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const result = await disable2FA(disableCode);

      if (!result.success) {
        toast.error(result.error || "Failed to disable 2FA");
        return;
      }

      setIsDisabling(false);
      setDisableCode("");
      toast.success("Two-factor authentication disabled");
      // Refresh page to update state
      window.location.reload();
    } catch {
      toast.error("Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (regenerateCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const result = await regenerateBackupCodes(regenerateCode);

      if (!result.success) {
        toast.error(result.error || "Failed to regenerate codes");
        return;
      }

      setBackupCodes(result.data!.backupCodes);
      setIsRegenerating(false);
      setRegenerateCode("");
      toast.success("New backup codes generated!");
    } catch {
      toast.error("Failed to regenerate codes");
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

  const closeSetupDialog = () => {
    setIsEnabling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
    setBackupCodes(null);
    if (backupCodes) {
      window.location.reload();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account by requiring a
            verification code when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabled ? (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-green-600">2FA is enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled on{" "}
                    {verifiedAt?.toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
              </div>

              {backupCodesRemaining <= 3 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-4 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm">
                    You have {backupCodesRemaining} backup code
                    {backupCodesRemaining !== 1 ? "s" : ""} remaining.
                    Consider regenerating new codes.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRegenerating(true)}
                >
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsDisabling(true)}
                >
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security by
                requiring a code from your authenticator app when you sign in.
              </p>
              <Button onClick={handleStartSetup} disabled={loading}>
                {loading ? "Setting up..." : "Enable 2FA"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={isEnabling} onOpenChange={(open) => !open && closeSetupDialog()}>
        <DialogContent className="max-w-md">
          {!backupCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Scan this QR code with your authenticator app
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {qrCode && (
                  <div className="flex justify-center rounded-lg bg-white p-4">
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
                    <Label>Or enter this code manually:</Label>
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
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeSetupDialog}>
                  Cancel
                </Button>
                <Button onClick={handleVerify} disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Enable"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Save Your Backup Codes</DialogTitle>
                <DialogDescription>
                  Store these codes in a safe place. You can use them to sign in
                  if you lose access to your authenticator app.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="rounded bg-background p-2 text-center">
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

                <p className="text-sm text-muted-foreground">
                  Each code can only be used once. When you run out, you can
                  generate new ones from your security settings.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={closeSetupDialog}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={isDisabling} onOpenChange={setIsDisabling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter a code from your authenticator app to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code</Label>
              <Input
                id="disable-code"
                placeholder="000000"
                value={disableCode}
                onChange={(e) =>
                  setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisabling(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={loading}
            >
              {loading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={isRegenerating} onOpenChange={setIsRegenerating}>
        <DialogContent>
          {!backupCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>Regenerate Backup Codes</DialogTitle>
                <DialogDescription>
                  This will invalidate your existing backup codes. Enter a code
                  from your authenticator app to confirm.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="regenerate-code">Verification Code</Label>
                  <Input
                    id="regenerate-code"
                    placeholder="000000"
                    value={regenerateCode}
                    onChange={(e) =>
                      setRegenerateCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    maxLength={6}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRegenerating(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleRegenerate} disabled={loading}>
                  {loading ? "Generating..." : "Generate New Codes"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New Backup Codes</DialogTitle>
                <DialogDescription>
                  Your old codes are no longer valid. Store these new codes in a
                  safe place.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, i) => (
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
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsRegenerating(false);
                    setBackupCodes(null);
                    setRegenerateCode("");
                    window.location.reload();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
