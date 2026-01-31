// @kindergarten/ui
// Shared UI components for all apps
//
// This package contains shadcn/ui components adapted for the monorepo structure.
// Currently includes core components; remaining components will be migrated
// when splitting into separate apps (Task #39).

// Utilities
export { cn } from "./cn";

// Core Components
export { Button, buttonVariants } from "./button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card";
export { Input } from "./input";
export { Label } from "./label";
export { Textarea } from "./textarea";
export { Skeleton } from "./skeleton";
export { Badge, badgeVariants } from "./badge";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet";

// The following components remain in src/components/ui/ for now
// and will be migrated during the app split (Task #39):
// - alert.tsx
// - alert-dialog.tsx
// - avatar.tsx
// - calendar.tsx
// - checkbox.tsx
// - dropdown-menu.tsx
// - form.tsx (depends on react-hook-form)
// - pagination.tsx
// - password-input.tsx
// - popover.tsx
// - progress.tsx
// - radio-group.tsx
// - select.tsx
// - separator.tsx
// - sheet.tsx
// - sonner.tsx
// - switch.tsx
// - table.tsx
// - tabs.tsx
// - tooltip.tsx
