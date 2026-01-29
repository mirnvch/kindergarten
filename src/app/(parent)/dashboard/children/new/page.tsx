import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChildForm } from "@/components/parent/child-form";

export const metadata: Metadata = {
  title: "Add Child | KinderCare",
  description: "Add a new child profile",
};

export default function NewChildPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/children">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Child</h1>
          <p className="text-muted-foreground">
            Create a profile for your child
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Child Information</CardTitle>
          <CardDescription>
            Enter your child&apos;s details. This information will be shared with
            daycares when you book tours or apply for enrollment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChildForm />
        </CardContent>
      </Card>
    </div>
  );
}
