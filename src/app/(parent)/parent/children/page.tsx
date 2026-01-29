import { Metadata } from "next";
import Link from "next/link";
import { Plus, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChildren } from "@/server/actions/children";
import { ChildCard } from "@/components/parent/child-card";

export const metadata: Metadata = {
  title: "My Children | KinderCare",
  description: "Manage your children's profiles",
};

export default async function ChildrenPage() {
  const children = await getChildren();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Children</h1>
          <p className="text-muted-foreground">
            Manage your children&apos;s profiles
          </p>
        </div>
        <Button asChild>
          <Link href="/parent/children/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Child
          </Link>
        </Button>
      </div>

      {/* Children list */}
      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Baby className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No children added yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your children&apos;s profiles to book tours and enroll in
            daycares.
          </p>
          <Button asChild>
            <Link href="/parent/children/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Child
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
