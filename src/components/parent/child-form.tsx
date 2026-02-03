"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createFamilyMember, updateFamilyMember, type FamilyMemberFormData } from "@/server/actions/children";
import { toast } from "sonner";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  relationship: z.string().min(1),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  conditions: z.string().optional(),
  notes: z.string().optional(),
});

// Support both old and new prop names
interface ChildFormProps {
  child?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string | null;
    relationship?: string;
    allergies: string | null;
    medications?: string | null;
    conditions?: string | null;
    // Legacy fields
    specialNeeds?: string | null;
    notes: string | null;
  };
}

export function ChildForm({ child }: ChildFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!child;

  const form = useForm<FamilyMemberFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: child?.firstName || "",
      lastName: child?.lastName || "",
      dateOfBirth: child?.dateOfBirth
        ? new Date(child.dateOfBirth).toISOString().split("T")[0]
        : "",
      gender: child?.gender || "",
      relationship: child?.relationship || "child",
      allergies: child?.allergies || "",
      medications: child?.medications || "",
      // Support legacy specialNeeds field by mapping to conditions
      conditions: child?.conditions || child?.specialNeeds || "",
      notes: child?.notes || "",
    },
  });

  function onSubmit(data: FamilyMemberFormData) {
    startTransition(async () => {
      try {
        if (isEditing && child) {
          await updateFamilyMember(child.id, data);
          toast.success("Family member profile updated");
        } else {
          await createFamilyMember(data);
          toast.success("Family member profile created");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="relationship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || "child"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Who is this family member in relation to you?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergies</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List any allergies (e.g., peanuts, dairy, bee stings)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include food allergies, environmental allergies, and medication
                allergies
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="medications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Medications</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List any current medications and dosages"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include prescription and over-the-counter medications
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="conditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Conditions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe any medical conditions or special needs"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include any chronic conditions, developmental needs, or special
                accommodations required
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any other information the daycare should know"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Child"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
