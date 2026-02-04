"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Star, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import {
  addProviderPhoto,
  updateProviderPhoto,
  deleteProviderPhoto,
} from "@/server/actions/portal/provider";
import { toast } from "sonner";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  order: number;
  isPrimary: boolean;
}

interface ProviderPhotosManagerProps {
  photos: Photo[];
}

export function ProviderPhotosManager({ photos }: ProviderPhotosManagerProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddPhoto = async () => {
    if (!newPhotoUrl) {
      toast.error("Please enter a photo URL");
      return;
    }

    setIsLoading(true);
    try {
      const result = await addProviderPhoto(newPhotoUrl, newPhotoCaption || undefined);
      if (result.success) {
        toast.success("Photo added successfully");
        setIsAddDialogOpen(false);
        setNewPhotoUrl("");
        setNewPhotoCaption("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add photo");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      const result = await updateProviderPhoto(photoId, { isPrimary: true });
      if (result.success) {
        toast.success("Primary photo updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update photo");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const result = await deleteProviderPhoto(photoId);
      if (result.success) {
        toast.success("Photo deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete photo");
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
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              Add photos to showcase your practice. The primary photo will be shown
              in search results.
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Photo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Photo</DialogTitle>
                <DialogDescription>
                  Add a new photo to your provider gallery
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="photoUrl">Photo URL *</Label>
                  <Input
                    id="photoUrl"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the URL of your photo. Recommended size: 1200x800px
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoCaption">Caption</Label>
                  <Input
                    id="photoCaption"
                    value={newPhotoCaption}
                    onChange={(e) => setNewPhotoCaption(e.target.value)}
                    placeholder="Our waiting room"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddPhoto} disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Photo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No photos yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add photos to help patients see your practice
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Photo
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg border bg-muted aspect-video"
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || "Provider photo"}
                  fill
                  className="object-cover"
                />
                {photo.isPrimary && (
                  <Badge className="absolute top-2 left-2">
                    <Star className="mr-1 h-3 w-3" />
                    Primary
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  {!photo.isPrimary && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSetPrimary(photo.id)}
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this photo? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(photo.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                    <p className="text-xs text-white truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
