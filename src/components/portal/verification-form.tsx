"use client";

import { useState, useTransition } from "react";
import { Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitVerificationRequest } from "@/server/actions/verification";

interface VerificationFormProps {
  providerId: string;
}

interface Document {
  id: string;
  type: "license" | "insurance" | "background_check" | "other";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

const DOCUMENT_TYPES = [
  { value: "license", label: "Professional License" },
  { value: "insurance", label: "Insurance Certificate" },
  { value: "background_check", label: "Background Check" },
  { value: "other", label: "Other Document" },
];

export function VerificationForm({ providerId }: VerificationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: Document["type"]
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a PDF or image.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "verification");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();

      const newDoc: Document = {
        id: crypto.randomUUID(),
        type,
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type,
      };

      setDocuments((prev) => [...prev, newDoc]);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!licenseNumber.trim()) {
      toast.error("Please enter your license number");
      return;
    }

    if (!licenseState) {
      toast.error("Please select your license state");
      return;
    }

    if (documents.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    const hasLicense = documents.some((doc) => doc.type === "license");
    if (!hasLicense) {
      toast.error("Please upload your professional license document");
      return;
    }

    startTransition(async () => {
      const result = await submitVerificationRequest({
        providerId,
        licenseNumber: licenseNumber.trim(),
        licenseState,
        licenseExpiry: licenseExpiry
          ? new Date(licenseExpiry).toISOString()
          : undefined,
        documents: documents.map((doc) => ({
          type: doc.type,
          name: doc.name,
          url: doc.url,
          size: doc.size,
          mimeType: doc.mimeType,
        })),
      });

      if (result.success) {
        toast.success("Verification request submitted successfully!");
        // Reset form
        setLicenseNumber("");
        setLicenseState("");
        setLicenseExpiry("");
        setDocuments([]);
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    });
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (mimeType?.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Verification Request</CardTitle>
        <CardDescription>
          Provide your license information and upload required documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* License Information */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number *</Label>
              <Input
                id="licenseNumber"
                placeholder="e.g., DCC-12345"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseState">License State *</Label>
              <Select value={licenseState} onValueChange={setLicenseState}>
                <SelectTrigger id="licenseState">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseExpiry">License Expiry Date</Label>
              <Input
                id="licenseExpiry"
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <Label>Documents *</Label>

            {/* Upload Buttons */}
            <div className="grid gap-4 md:grid-cols-2">
              {DOCUMENT_TYPES.map((docType) => (
                <div key={docType.value} className="relative">
                  <input
                    type="file"
                    id={`upload-${docType.value}`}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) =>
                      handleFileUpload(e, docType.value as Document["type"])
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isUploading || isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    disabled={isUploading || isPending}
                  >
                    <Upload className="h-4 w-4" />
                    Upload {docType.label}
                  </Button>
                </div>
              ))}
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Uploaded Documents ({documents.length})
                </p>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(doc.mimeType)}
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOCUMENT_TYPES.find((t) => t.value === doc.type)
                              ?.label || doc.type}
                            {doc.size &&
                              ` • ${(doc.size / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocument(doc.id)}
                        disabled={isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPG, PNG, WebP. Maximum file size: 10MB.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || isUploading || documents.length === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Verification Request"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
