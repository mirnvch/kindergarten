"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Get templates for daycare
export async function getMessageTemplates(providerId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify user has access to this daycare
  const hasAccess = await db.providerStaff.findFirst({
    where: {
      providerId,
      userId: session.user.id,
    },
  });

  if (!hasAccess && session.user.role !== "ADMIN") {
    throw new Error("Access denied");
  }

  const templates = await db.messageTemplate.findMany({
    where: {
      providerId,
      isActive: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return templates;
}

// Create template
const createTemplateSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1, "Template name is required").max(100),
  content: z.string().min(1, "Content is required").max(2000),
  category: z.string().optional(),
});

export async function createMessageTemplate(input: z.infer<typeof createTemplateSchema>) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validated = createTemplateSchema.parse(input);

  // Verify user has access
  const hasAccess = await db.providerStaff.findFirst({
    where: {
      providerId: validated.providerId,
      userId: session.user.id,
      role: { in: ["owner", "manager"] },
    },
  });

  if (!hasAccess && session.user.role !== "ADMIN") {
    throw new Error("Access denied");
  }

  const template = await db.messageTemplate.create({
    data: {
      providerId: validated.providerId,
      name: validated.name,
      content: validated.content,
      category: validated.category || "general",
    },
  });

  revalidatePath("/portal/messages");

  return template;
}

// Update template
const updateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function updateMessageTemplate(input: z.infer<typeof updateTemplateSchema>) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validated = updateTemplateSchema.parse(input);

  // Get template and verify access
  const template = await db.messageTemplate.findUnique({
    where: { id: validated.id },
    include: {
      provider: {
        include: {
          staff: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const hasAccess =
    template.provider.staff.some((s) => ["owner", "manager"].includes(s.role)) ||
    session.user.role === "ADMIN";

  if (!hasAccess) {
    throw new Error("Access denied");
  }

  const updated = await db.messageTemplate.update({
    where: { id: validated.id },
    data: {
      ...(validated.name && { name: validated.name }),
      ...(validated.content && { content: validated.content }),
      ...(validated.category !== undefined && { category: validated.category }),
      ...(validated.isActive !== undefined && { isActive: validated.isActive }),
    },
  });

  revalidatePath("/portal/messages");

  return updated;
}

// Delete template
export async function deleteMessageTemplate(id: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Get template and verify access
  const template = await db.messageTemplate.findUnique({
    where: { id },
    include: {
      provider: {
        include: {
          staff: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const hasAccess =
    template.provider.staff.some((s) => ["owner", "manager"].includes(s.role)) ||
    session.user.role === "ADMIN";

  if (!hasAccess) {
    throw new Error("Access denied");
  }

  await db.messageTemplate.delete({
    where: { id },
  });

  revalidatePath("/portal/messages");
}

// Default templates for new daycares
export const DEFAULT_TEMPLATES = [
  {
    name: "Welcome Message",
    category: "welcome",
    content: `Hello! Thank you for reaching out to us. We're excited to hear from you and would love to help answer any questions about our daycare program.

Please let us know how we can assist you today!`,
  },
  {
    name: "Tour Confirmation",
    category: "booking",
    content: `We're looking forward to meeting you and showing you around our facility!

Please remember:
- Arrive 5-10 minutes early
- Bring any questions you have
- Feel free to bring your child along

If you need to reschedule, please let us know at least 24 hours in advance.

See you soon!`,
  },
  {
    name: "Enrollment Information",
    category: "enrollment",
    content: `Thank you for your interest in enrolling your child with us!

Here's what you'll need to complete enrollment:
- Completed registration forms
- Immunization records
- Emergency contact information
- Registration fee

Please feel free to ask any questions about our programs, schedules, or policies.`,
  },
  {
    name: "FAQ - Hours & Schedule",
    category: "faq",
    content: `Our hours of operation are Monday through Friday.

Drop-off: Starting at opening time
Pick-up: By closing time

We follow the local school district calendar for major holidays. A complete holiday schedule is provided upon enrollment.`,
  },
  {
    name: "FAQ - Pricing",
    category: "faq",
    content: `We offer flexible scheduling options to meet your family's needs:

- Full-time (5 days/week)
- Part-time (2-4 days/week)
- Before/After school care

Please schedule a tour to discuss pricing options that work best for your family.`,
  },
];

// Initialize default templates for a daycare
export async function initializeDefaultTemplates(providerId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if templates already exist
  const existingCount = await db.messageTemplate.count({
    where: { providerId },
  });

  if (existingCount > 0) {
    return; // Already has templates
  }

  // Create default templates
  await db.messageTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({
      providerId,
      ...t,
    })),
  });

  revalidatePath("/portal/messages");
}
