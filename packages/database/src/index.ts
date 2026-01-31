// @kindergarten/database
// Shared database client and Prisma types
//
// This package provides the Prisma client and re-exports types.
// The prisma/ folder remains at root level until apps are split (Task #39).

export { db } from "./client";

// Re-export Prisma types for convenience
// Note: These are generated from the schema at root level
export type {
  User,
  Account,
  Session,
  VerificationToken,
  Child,
  Daycare,
  DaycareStaff,
  DaycarePhoto,
  Program,
  Amenity,
  DaycareAmenity,
  DaycareSchedule,
  Booking,
  Enrollment,
  WaitlistEntry,
  Review,
  MessageThread,
  Message,
  MessageAttachment,
  MessageTemplate,
  Subscription,
  Payment,
  Notification,
  NotificationPreference,
  AuditLog,
  PlatformSettings,
  WebhookEvent,
  Favorite,
  SavedSearch,
  VerificationRequest,
} from "@prisma/client";

// Re-export enums
export {
  UserRole,
  DaycareStatus,
  BookingType,
  RecurrencePattern,
  BookingStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentStatus,
  VerificationStatus,
  MessageStatus,
} from "@prisma/client";
