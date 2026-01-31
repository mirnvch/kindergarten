"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, Crown, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Switch } from "@/components/ui/switch";
import {
  addStaff,
  updateStaffRole,
  removeStaff,
  toggleStaffActive,
  type AddStaffInput,
} from "@/server/actions/portal/staff";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

interface StaffMember {
  id: string;
  role: string;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

interface StaffManagerProps {
  staff: StaffMember[];
}

const ROLE_CONFIG = {
  owner: { label: "Owner", icon: Crown, color: "bg-yellow-100 text-yellow-800" },
  manager: { label: "Manager", icon: ShieldCheck, color: "bg-blue-100 text-blue-800" },
  staff: { label: "Staff", icon: User, color: "bg-gray-100 text-gray-800" },
};

export function StaffManager({ staff }: StaffManagerProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AddStaffInput>({
    email: "",
    role: "staff",
  });

  const handleAddStaff = async () => {
    if (!formData.email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await addStaff(formData);
      if (result.success) {
        toast.success("Staff member added successfully");
        setIsAddDialogOpen(false);
        setFormData({ email: "", role: "staff" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add staff member");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (staffId: string, role: "manager" | "staff") => {
    try {
      const result = await updateStaffRole(staffId, role);
      if (result.success) {
        toast.success("Role updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleRemove = async (staffId: string) => {
    try {
      const result = await removeStaff(staffId);
      if (result.success) {
        toast.success("Staff member removed");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to remove staff member");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleToggleActive = async (staffId: string) => {
    try {
      const result = await toggleStaffActive(staffId);
      if (result.success) {
        toast.success("Status updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff
            </CardTitle>
            <CardDescription>
              Manage your daycare staff members and their access levels
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No staff members yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add staff members to help manage your daycare
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Staff Member
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {staff.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.staff;
              const RoleIcon = roleConfig.icon;

              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !member.isActive ? "opacity-60 bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(member.user.firstName, member.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <Badge className={roleConfig.color}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {roleConfig.label}
                        </Badge>
                        {!member.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  {member.role !== "owner" && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${member.id}`} className="text-sm">
                          Active
                        </Label>
                        <Switch
                          id={`active-${member.id}`}
                          checked={member.isActive}
                          onCheckedChange={() => handleToggleActive(member.id)}
                        />
                      </div>

                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(member.id, v as "manager" | "staff")
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Remove staff member">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.user.firstName}{" "}
                              {member.user.lastName} from your staff?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Add a new staff member by their email address. They must have an
              existing account on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email Address *</Label>
              <Input
                id="staffEmail"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffRole">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    role: v as "manager" | "staff",
                  }))
                }
              >
                <SelectTrigger id="staffRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Manager - Full access
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Staff - Limited access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
