/**
 * Centralized type definitions for the DocConnect application.
 * These types are derived from Prisma schema and used across server actions and components.
 */

import { Prisma } from "@prisma/client";

// Re-export ActionResult types for convenience
export type {
  ActionResult,
  PaginatedResult,
  ActionResultWithMeta,
} from "./action-result";

// ==================== APPOINTMENT TYPES ====================

/**
 * Appointment with provider and family member relations (used in patient appointments list)
 */
export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    provider: {
      select: {
        id: true;
        name: true;
        slug: true;
        address: true;
        city: true;
        state: true;
        specialty: true;
      };
    };
    familyMember: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
    service: {
      select: {
        id: true;
        name: true;
        duration: true;
      };
    };
  };
}>;

/**
 * Appointment with full details (used in confirmation page)
 */
export type AppointmentFull = Prisma.AppointmentGetPayload<{
  include: {
    provider: {
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
        specialty: true;
        offersTelehealth: true;
      };
    };
    familyMember: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        dateOfBirth: true;
        relationship: true;
      };
    };
    patient: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    service: {
      select: {
        id: true;
        name: true;
        duration: true;
        price: true;
        isTelehealth: true;
      };
    };
  };
}>;

/**
 * Appointment for portal (provider view with patient details)
 */
export type PortalAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
      };
    };
    familyMember: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        dateOfBirth: true;
      };
    };
    service: {
      select: {
        id: true;
        name: true;
        duration: true;
      };
    };
  };
}>;

// ==================== FAMILY MEMBER TYPES ====================

/**
 * Family member basic info
 */
export type FamilyMember = Prisma.FamilyMemberGetPayload<object>;

/**
 * Family member with appointments
 */
export type FamilyMemberWithRelations = Prisma.FamilyMemberGetPayload<{
  include: {
    appointments: {
      include: {
        provider: {
          select: {
            name: true;
            slug: true;
            specialty: true;
          };
        };
      };
    };
  };
}>;

// ==================== PROVIDER TYPES ====================

/**
 * Provider photo
 */
export type ProviderPhoto = Prisma.ProviderPhotoGetPayload<object>;

/**
 * Service (raw from Prisma)
 */
export type ServiceRaw = Prisma.ServiceGetPayload<object>;

/**
 * Service (transformed with price as number)
 */
export type ProviderService = Omit<ServiceRaw, "price"> & {
  price: number;
};

/**
 * Provider facility with relation (raw)
 */
export type ProviderFacilityWithDetails = Prisma.ProviderFacilityGetPayload<{
  include: {
    facility: true;
  };
}>;

/**
 * Facility (transformed - extracted from junction table)
 */
export type Facility = Prisma.FacilityGetPayload<object>;

/**
 * Provider review with user
 */
export type ProviderReview = Prisma.ReviewGetPayload<{
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
 * Full provider details (used in provider page)
 */
export type ProviderFull = Prisma.ProviderGetPayload<{
  include: {
    photos: true;
    services: true;
    facilities: {
      include: {
        facility: true;
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

/**
 * Provider for search results (compact)
 */
export type ProviderSearchResult = Prisma.ProviderGetPayload<{
  select: {
    id: true;
    slug: true;
    name: true;
    type: true;
    specialty: true;
    credentials: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    latitude: true;
    longitude: true;
    consultationFee: true;
    telehealthFee: true;
    offersTelehealth: true;
    acceptingNewPatients: true;
    acceptedInsurance: true;
    languages: true;
    isVerified: true;
    photos: {
      select: {
        url: true;
      };
      take: 1;
    };
  };
}>;

// ==================== FAVORITE TYPES ====================

/**
 * Favorite with provider details (raw)
 */
export type FavoriteWithProviderRaw = Prisma.FavoriteGetPayload<{
  include: {
    provider: {
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
  provider: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    specialty: string | null;
    credentials: string | null;
    consultationFee: Prisma.Decimal | null;
    offersTelehealth: boolean;
    photo: string | null;
    rating: number | null;
    reviewCount: number;
  };
}

// ==================== DASHBOARD TYPES ====================

/**
 * Dashboard appointment item for patient (compact view)
 */
export type DashboardAppointment = Prisma.AppointmentGetPayload<{
  include: {
    provider: { select: { name: true; slug: true; specialty: true } };
    familyMember: { select: { firstName: true } };
    service: { select: { name: true } };
  };
}>;

/**
 * Dashboard appointment item for portal provider (compact view)
 */
export type PortalDashboardAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: { select: { firstName: true; lastName: true } };
    familyMember: { select: { firstName: true } };
    service: { select: { name: true } };
  };
}>;

// ==================== SPECIALTY & INSURANCE TYPES ====================

/**
 * Medical specialty
 */
export type Specialty = Prisma.SpecialtyGetPayload<object>;

/**
 * Insurance provider
 */
export type Insurance = Prisma.InsuranceGetPayload<object>;

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

// ==================== LEGACY TYPE ALIASES (for gradual migration) ====================
// These aliases help with backwards compatibility during migration

/** @deprecated Use AppointmentWithRelations instead */
export type BookingWithRelations = AppointmentWithRelations;

/** @deprecated Use AppointmentFull instead */
export type BookingFull = AppointmentFull;

/** @deprecated Use PortalAppointment instead */
export type PortalBooking = PortalAppointment;

/** @deprecated Use FamilyMember instead */
export type Child = FamilyMember;

/** @deprecated Use FamilyMemberWithRelations instead */
export type ChildWithRelations = FamilyMemberWithRelations;

/** @deprecated Use ProviderPhoto instead */
export type DaycarePhoto = ProviderPhoto;

/** @deprecated Use ServiceRaw instead */
export type DaycareProgramRaw = ServiceRaw;

/** @deprecated Use ProviderService instead */
export type DaycareProgram = ProviderService;

/** @deprecated Use ProviderFacilityWithDetails instead */
export type DaycareAmenityWithDetails = ProviderFacilityWithDetails;

/** @deprecated Use Facility instead */
export type Amenity = Facility;

/** @deprecated Use ProviderReview instead */
export type DaycareReview = ProviderReview;

/** @deprecated Use ProviderFull instead */
export type DaycareFull = ProviderFull;

/** @deprecated Use FavoriteWithProviderRaw instead */
export type FavoriteWithDaycareRaw = FavoriteWithProviderRaw;

/** @deprecated Use DashboardAppointment instead */
export type DashboardBooking = DashboardAppointment;

/** @deprecated Use PortalDashboardAppointment instead */
export type PortalDashboardBooking = PortalDashboardAppointment;
