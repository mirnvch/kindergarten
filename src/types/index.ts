/**
 * Centralized type definitions for the KinderCare application.
 * These types are derived from Prisma schema and used across server actions and components.
 */

import { Prisma } from "@prisma/client";

// ==================== BOOKING TYPES ====================

/**
 * Booking with daycare and child relations (used in parent bookings list)
 */
export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    daycare: {
      select: {
        id: true;
        name: true;
        slug: true;
        address: true;
        city: true;
        state: true;
      };
    };
    child: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

/**
 * Booking with full details (used in confirmation page)
 */
export type BookingFull = Prisma.BookingGetPayload<{
  include: {
    daycare: {
      select: {
        id: true;
        name: true;
        slug: true;
        address: true;
        city: true;
        state: true;
        zipCode: true;
        phone: true;
        email: true;
      };
    };
    child: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        dateOfBirth: true;
      };
    };
    parent: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

/**
 * Booking for portal (owner view with parent details)
 */
export type PortalBooking = Prisma.BookingGetPayload<{
  include: {
    parent: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
      };
    };
    child: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        dateOfBirth: true;
      };
    };
  };
}>;

// ==================== CHILD TYPES ====================

/**
 * Child basic info
 */
export type Child = Prisma.ChildGetPayload<{}>;

/**
 * Child with enrollments and bookings
 */
export type ChildWithRelations = Prisma.ChildGetPayload<{
  include: {
    enrollments: {
      include: {
        daycare: {
          select: {
            name: true;
            slug: true;
          };
        };
      };
    };
    bookings: {
      include: {
        daycare: {
          select: {
            name: true;
            slug: true;
          };
        };
      };
    };
  };
}>;

// ==================== DAYCARE TYPES ====================

/**
 * Daycare photo
 */
export type DaycarePhoto = Prisma.DaycarePhotoGetPayload<{}>;

/**
 * Daycare program (raw from Prisma)
 */
export type DaycareProgramRaw = Prisma.ProgramGetPayload<{}>;

/**
 * Daycare program (transformed with price as number)
 */
export type DaycareProgram = Omit<DaycareProgramRaw, "price"> & {
  price: number;
};

/**
 * Daycare amenity with relation (raw)
 */
export type DaycareAmenityWithDetails = Prisma.DaycareAmenityGetPayload<{
  include: {
    amenity: true;
  };
}>;

/**
 * Amenity (transformed - extracted from junction table)
 */
export type Amenity = Prisma.AmenityGetPayload<{}>;

/**
 * Daycare review with user
 */
export type DaycareReview = Prisma.ReviewGetPayload<{
  include: {
    user: {
      select: {
        firstName: true;
        lastName: true;
        avatarUrl: true;
      };
    };
  };
}>;

/**
 * Full daycare details (used in daycare page)
 */
export type DaycareFull = Prisma.DaycareGetPayload<{
  include: {
    photos: true;
    programs: true;
    amenities: {
      include: {
        amenity: true;
      };
    };
    reviews: {
      include: {
        user: {
          select: {
            firstName: true;
            lastName: true;
            avatarUrl: true;
          };
        };
      };
    };
    staff: {
      include: {
        user: {
          select: {
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;

// ==================== FAVORITE TYPES ====================

/**
 * Favorite with daycare details (raw)
 */
export type FavoriteWithDaycareRaw = Prisma.FavoriteGetPayload<{
  include: {
    daycare: {
      include: {
        photos: true;
        reviews: {
          select: {
            rating: true;
          };
        };
      };
    };
  };
}>;

/**
 * Favorite item (transformed for display)
 */
export interface FavoriteItem {
  id: string;
  createdAt: Date;
  daycare: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    pricePerMonth: Prisma.Decimal;
    minAge: number;
    maxAge: number;
    photo: string | null;
    rating: number | null;
    reviewCount: number;
  };
}

// ==================== DASHBOARD TYPES ====================

/**
 * Dashboard booking item for parent (compact view)
 */
export type DashboardBooking = Prisma.BookingGetPayload<{
  include: {
    daycare: { select: { name: true; slug: true } };
    child: { select: { firstName: true } };
  };
}>;

/**
 * Dashboard booking item for portal owner (compact view)
 */
export type PortalDashboardBooking = Prisma.BookingGetPayload<{
  include: {
    parent: { select: { firstName: true; lastName: true } };
    child: { select: { firstName: true } };
  };
}>;

// ==================== UTILITY TYPES ====================

/**
 * Helper to extract array element type
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Helper for async function return types
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;
