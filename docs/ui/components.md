# Components Library

Каталог UI компонентов проекта DocConnect, основанный на shadcn/ui.

---

## Содержание

1. [Установка и использование](#установка-и-использование)
2. [Button](#button)
3. [Input & Form](#input--form)
4. [Card](#card)
5. [Dialog](#dialog)
6. [Table](#table)
7. [Dropdown Menu](#dropdown-menu)
8. [Tabs](#tabs)
9. [Toast](#toast)
10. [Skeleton](#skeleton)

---

## Установка и использование

### Добавление компонента

```bash
# Через shadcn CLI
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
```

### Импорт

```typescript
// Все компоненты в src/components/ui/
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
```

---

## Button

### Variants

```typescript
import { Button } from "@/components/ui/button";

// Primary — main action
<Button>Continue</Button>

// Secondary — cancel, back
<Button variant="secondary">Cancel</Button>

// Destructive — delete, dangerous actions
<Button variant="destructive">Delete</Button>

// Outline — edit, secondary actions
<Button variant="outline">Edit</Button>

// Ghost — minimal, in toolbars
<Button variant="ghost">Settings</Button>

// Link — looks like a link
<Button variant="link">Learn more</Button>
```

### Sizes

```typescript
// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <Plus className="h-4 w-4" />
</Button>
```

### With Icons

```typescript
import { Loader2, Mail } from "lucide-react";

// Icon left
<Button>
  <Mail className="mr-2 h-4 w-4" />
  Email
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### As Child

```typescript
import Link from "next/link";

// Button as Link
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

---

## Input & Form

### Basic Input

```typescript
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
  />
</div>
```

### With React Hook Form

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Некорректный email"),
  name: z.string().min(2, "Минимум 2 символа"),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  function onSubmit(data: FormValues) {
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input placeholder="Иван Иванов" {...field} />
              </FormControl>
              <FormDescription>
                Ваше публичное имя
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Сохранение..." : "Сохранить"}
        </Button>
      </form>
    </Form>
  );
}
```

### Textarea

```typescript
import { Textarea } from "@/components/ui/textarea";

<FormField
  control={form.control}
  name="bio"
  render={({ field }) => (
    <FormItem>
      <FormLabel>О себе</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Расскажите о себе..."
          className="resize-none"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Роль</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Выберите роль" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="user">Пользователь</SelectItem>
          <SelectItem value="admin">Администратор</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Card

### Basic Card

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Название</CardTitle>
    <CardDescription>Краткое описание</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Основной контент карточки</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Interactive Card

```typescript
// Clickable card
<Card className="cursor-pointer transition-shadow hover:shadow-lg">
  <CardHeader>
    <CardTitle>Click me</CardTitle>
  </CardHeader>
</Card>

// Card as Link
<Link href="/service/1" className="block">
  <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
    <CardHeader>
      <CardTitle>Service Name</CardTitle>
    </CardHeader>
  </Card>
</Link>
```

---

## Dialog

### Basic Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Вы уверены?</DialogTitle>
      <DialogDescription>
        Это действие нельзя отменить.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Отмена</Button>
      </DialogClose>
      <Button variant="destructive">Удалить</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Controlled Dialog

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EditDialog({ user }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(data: FormData) {
    await updateUser(data);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit}>
          {/* form fields */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Table

### Data Table

```typescript
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

<Table>
  <TableCaption>Список пользователей</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Имя</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Роль</TableHead>
      <TableHead className="text-right">Действия</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### With Sorting (TanStack Table)

```typescript
// Для сложных таблиц используй @tanstack/react-table
// См. https://ui.shadcn.com/docs/components/data-table
```

---

## Dropdown Menu

### Basic Dropdown

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash, Copy } from "lucide-react";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Действия</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Copy className="mr-2 h-4 w-4" />
      Копировать
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      Редактировать
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />
      Удалить
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Tabs

### Basic Tabs

```typescript
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

<Tabs defaultValue="profile" className="w-full">
  <TabsList>
    <TabsTrigger value="profile">Профиль</TabsTrigger>
    <TabsTrigger value="settings">Настройки</TabsTrigger>
    <TabsTrigger value="notifications">Уведомления</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">
    <Card>
      <CardContent className="pt-6">
        Profile content...
      </CardContent>
    </Card>
  </TabsContent>
  <TabsContent value="settings">
    <Card>
      <CardContent className="pt-6">
        Settings content...
      </CardContent>
    </Card>
  </TabsContent>
  <TabsContent value="notifications">
    <Card>
      <CardContent className="pt-6">
        Notifications content...
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## Toast

### Setup

```typescript
// src/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### Usage

```typescript
"use client";

import { toast } from "sonner";

function handleSave() {
  toast.success("Сохранено!");
}

function handleError() {
  toast.error("Что-то пошло не так");
}

function handlePromise() {
  toast.promise(saveData(), {
    loading: "Сохранение...",
    success: "Сохранено!",
    error: "Ошибка при сохранении",
  });
}

// С действием
toast("Запись удалена", {
  action: {
    label: "Отменить",
    onClick: () => undoDelete(),
  },
});
```

---

## Skeleton

### Usage

```typescript
import { Skeleton } from "@/components/ui/skeleton";

// Loading state
function UserCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

// Avatar skeleton
<Skeleton className="h-12 w-12 rounded-full" />

// Text lines
<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-[80%]" />
  <Skeleton className="h-4 w-[60%]" />
</div>
```

### With Suspense

```typescript
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<UserCardSkeleton />}>
      <UserCard />
    </Suspense>
  );
}
```

---

## Best Practices

### Composition over Props

```typescript
// ✅ Composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>

// ❌ Props drilling
<Card title="Title" content={children} />
```

### Accessible by Default

```typescript
// Все shadcn компоненты уже accessible
// Но добавляй labels где нужно

// Icon buttons
<Button variant="ghost" size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>

// Form fields
<Label htmlFor="email">Email</Label>
<Input id="email" aria-describedby="email-description" />
<p id="email-description" className="text-sm text-muted-foreground">
  Мы не будем делиться вашим email
</p>
```

### Loading States

```typescript
// Всегда показывай loading state
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Сохранение...
    </>
  ) : (
    "Сохранить"
  )}
</Button>
```

---

_См. также:_

- [Design System](./design-system.md)
- [Accessibility](./accessibility.md)
- [Frontend Guide](../guides/frontend.md)
