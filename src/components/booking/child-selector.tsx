"use client";

import Link from "next/link";
import { Baby, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

interface ChildSelectorProps {
  childList: Child[];
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
  addChildUrl?: string;
}

export function ChildSelector({
  childList,
  selectedChildId,
  onSelectChild,
  addChildUrl = "/parent/children/new",
}: ChildSelectorProps) {
  if (childList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
        <Baby className="mb-2 h-10 w-10 text-muted-foreground" />
        <p className="mb-4 text-muted-foreground">
          You haven&apos;t added any children yet.
        </p>
        <Button asChild>
          <Link href={addChildUrl}>
            <Plus className="mr-2 h-4 w-4" />
            Add a Child
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {childList.map((child) => {
          const isSelected = selectedChildId === child.id;
          const age = calculateAge(new Date(child.dateOfBirth));
          const ageText =
            age.years > 0
              ? `${age.years} yr${age.years > 1 ? "s" : ""}${age.months > 0 ? ` ${age.months} mo` : ""}`
              : `${age.months} mo`;

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelectChild(child.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-border hover:border-primary hover:bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Baby className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {child.firstName} {child.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{ageText} old</p>
              </div>
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && (
                  <svg
                    className="h-full w-full text-primary-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href={addChildUrl}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another Child
          </Link>
        </Button>
      </div>
    </div>
  );
}
