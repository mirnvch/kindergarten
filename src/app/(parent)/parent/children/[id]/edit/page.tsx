import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChildForm } from "@/components/parent/child-form";
import { getChildById } from "@/server/actions/children";

export const metadata: Metadata = {
  title: "Edit Child | KinderCare",
  description: "Edit child profile",
};

interface EditChildPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChildPage({ params }: EditChildPageProps) {
  const { id } = await params;
  const child = await getChildById(id);

  if (!child) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent/children">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Edit {child.firstName}&apos;s Profile
          </h1>
          <p className="text-muted-foreground">
            Update your child&apos;s information
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Child Information</CardTitle>
          <CardDescription>
            Update your child&apos;s details. Changes will be reflected in all
            pending bookings and enrollments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChildForm child={child} />
        </CardContent>
      </Card>
    </div>
  );
}
