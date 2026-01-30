"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from "@/server/actions/message-templates";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
}

interface TemplateSelectorProps {
  daycareId: string;
  onSelect: (content: string) => void;
}

const CATEGORIES = [
  { value: "welcome", label: "Welcome" },
  { value: "booking", label: "Booking" },
  { value: "enrollment", label: "Enrollment" },
  { value: "faq", label: "FAQ" },
  { value: "general", label: "General" },
];

export function TemplateSelector({ daycareId, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, daycareId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getMessageTemplates(daycareId);
      setTemplates(data);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (template: Template) => {
    onSelect(template.content);
    setIsOpen(false);
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
    setFormCategory("general");
    setEditDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormContent(template.content);
    setFormCategory(template.category || "general");
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) {
      toast.error("Name and content are required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateMessageTemplate({
          id: editingTemplate.id,
          name: formName,
          content: formContent,
          category: formCategory,
        });
        toast.success("Template updated");
      } else {
        await createMessageTemplate({
          daycareId,
          name: formName,
          content: formContent,
          category: formCategory,
        });
        toast.success("Template created");
      }
      setEditDialogOpen(false);
      loadTemplates();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMessageTemplate(id);
      toast.success("Template deleted");
      loadTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  // Group templates by category
  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const category = template.category || "general";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, Template[]>
  );

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" title="Message Templates">
            <FileText className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b flex items-center justify-between">
            <h4 className="font-medium">Message Templates</h4>
            <Button variant="ghost" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No templates yet.
                <br />
                <Button
                  variant="link"
                  className="text-sm p-0 h-auto"
                  onClick={openCreateDialog}
                >
                  Create your first template
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-4">
                {Object.entries(groupedTemplates).map(([category, items]) => (
                  <div key={category}>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2 px-2">
                      {CATEGORIES.find((c) => c.value === category)?.label || category}
                    </h5>
                    <div className="space-y-1">
                      {items.map((template) => (
                        <div
                          key={template.id}
                          className="group flex items-center justify-between rounded-md hover:bg-muted p-2"
                        >
                          <button
                            className="flex-1 text-left text-sm"
                            onClick={() => handleSelect(template)}
                          >
                            {template.name}
                          </button>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(template);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update your message template"
                : "Create a reusable message template"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Welcome Message"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Type your template message..."
                className="min-h-[150px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingTemplate ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
