"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProgram,
  updateProgram,
  deleteProgram,
  type ProgramInput,
} from "@/server/actions/portal/programs";
import { toast } from "sonner";
import { Prisma } from "@prisma/client";

interface Program {
  id: string;
  name: string;
  description: string | null;
  ageMin: number;
  ageMax: number;
  price: Prisma.Decimal;
  schedule: string | null;
}

interface ProgramsManagerProps {
  programs: Program[];
}

const SCHEDULE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "before-after-school", label: "Before/After School" },
  { value: "summer", label: "Summer Program" },
  { value: "drop-in", label: "Drop-in" },
];

function formatAgeRange(minMonths: number, maxMonths: number) {
  const formatAge = (months: number) => {
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} yr`;
    return `${years} yr ${remainingMonths} mo`;
  };
  return `${formatAge(minMonths)} - ${formatAge(maxMonths)}`;
}

const emptyForm: ProgramInput = {
  name: "",
  description: "",
  ageMin: 0,
  ageMax: 60,
  price: 0,
  schedule: "",
};

export function ProgramsManager({ programs }: ProgramsManagerProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState<ProgramInput>(emptyForm);

  const openCreateDialog = () => {
    setEditingProgram(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description || "",
      ageMin: program.ageMin,
      ageMax: program.ageMax,
      price: Number(program.price),
      schedule: program.schedule || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = editingProgram
        ? await updateProgram(editingProgram.id, formData)
        : await createProgram(formData);

      if (result.success) {
        toast.success(editingProgram ? "Program updated" : "Program created");
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save program");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteProgram(id);
      if (result.success) {
        toast.success("Program deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete program");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const updateField = (field: keyof ProgramInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Programs</CardTitle>
            <CardDescription>
              Manage the programs you offer at your daycare
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Program
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No programs yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add programs to show parents what age groups you serve
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Program
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {programs.map((program) => (
              <div
                key={program.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{program.name}</h4>
                    {program.schedule && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {program.schedule}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ages: {formatAgeRange(program.ageMin, program.ageMax)}
                  </p>
                  {program.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {program.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      ${Number(program.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(program)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Program</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{program.name}&quot;?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(program.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? "Edit Program" : "Add Program"}
            </DialogTitle>
            <DialogDescription>
              {editingProgram
                ? "Update the program details"
                : "Create a new program for your daycare"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="programName">Program Name *</Label>
              <Input
                id="programName"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Infant Care, Toddler Program"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="programDescription">Description</Label>
              <Textarea
                id="programDescription"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe what this program offers..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageMin">Min Age (months) *</Label>
                <Input
                  id="ageMin"
                  type="number"
                  min={0}
                  value={formData.ageMin}
                  onChange={(e) =>
                    updateField("ageMin", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageMax">Max Age (months) *</Label>
                <Input
                  id="ageMax"
                  type="number"
                  min={1}
                  value={formData.ageMax}
                  onChange={(e) =>
                    updateField("ageMax", parseInt(e.target.value) || 1)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Monthly Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price}
                  onChange={(e) =>
                    updateField("price", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule Type</Label>
                <Select
                  value={formData.schedule || ""}
                  onValueChange={(v) => updateField("schedule", v)}
                >
                  <SelectTrigger id="schedule">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : editingProgram
                  ? "Save Changes"
                  : "Create Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
