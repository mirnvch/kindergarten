"use client";

import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAgeRange } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  description: string | null;
  ageMin: number;
  ageMax: number;
  price: number;
  schedule: string | null;
}

interface ProgramSelectorProps {
  programs: Program[];
  selectedProgramId: string | null;
  onSelectProgram: (programId: string | null) => void;
}

export function ProgramSelector({
  programs,
  selectedProgramId,
  onSelectProgram,
}: ProgramSelectorProps) {
  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
        <GraduationCap className="mb-2 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          This daycare hasn&apos;t listed any programs yet.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You can still submit an enrollment request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {programs.map((program) => {
        const isSelected = selectedProgramId === program.id;

        return (
          <button
            key={program.id}
            type="button"
            onClick={() => onSelectProgram(isSelected ? null : program.id)}
            className={cn(
              "w-full rounded-lg border p-4 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border hover:border-primary hover:bg-primary/5"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{program.name}</h4>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Ages: {formatAgeRange(program.ageMin, program.ageMax)}</span>
                  {program.schedule && (
                    <>
                      <span>•</span>
                      <span>{program.schedule}</span>
                    </>
                  )}
                </div>
                {program.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {program.description}
                  </p>
                )}
              </div>
              <div className="ml-4 text-right">
                <span className="text-lg font-bold text-primary">
                  ${program.price.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
