"use client";

import { UserCircle, Check, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function formatAge(dateOfBirth: Date): string {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} years old`;
}

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  relationship: string;
}

interface FamilyMemberSelectorProps {
  members: FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function FamilyMemberSelector({
  members,
  selectedId,
  onSelect,
}: FamilyMemberSelectorProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-6">
        <UserCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No family members added yet
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href="/dashboard/family">
            <Plus className="mr-2 h-4 w-4" />
            Add Family Member
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Option for self (no family member selected) */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
          selectedId === null
            ? "border-primary bg-primary/5"
            : "hover:bg-muted/50"
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <UserCircle className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Myself</p>
          <p className="text-sm text-muted-foreground">
            This appointment is for me
          </p>
        </div>
        {selectedId === null && (
          <Check className="h-5 w-5 text-primary" />
        )}
      </button>

      {/* Family members */}
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onSelect(member.id)}
          className={`w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
            selectedId === member.id
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <UserCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">
              {member.firstName} {member.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {member.relationship} • {formatAge(member.dateOfBirth)}
            </p>
          </div>
          {selectedId === member.id && (
            <Check className="h-5 w-5 text-primary" />
          )}
        </button>
      ))}

      {/* Add more link */}
      <div className="pt-2">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link href="/dashboard/family">
            <Plus className="mr-2 h-4 w-4" />
            Add Family Member
          </Link>
        </Button>
      </div>
    </div>
  );
}
