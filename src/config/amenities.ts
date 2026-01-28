export type AmenityCategory =
  | "safety"
  | "facilities"
  | "programs"
  | "meals"
  | "services";

export type AmenityConfig = {
  name: string;
  icon: string;
  category: AmenityCategory;
};

export const AMENITIES: AmenityConfig[] = [
  // Safety
  { name: "Licensed & Insured", icon: "shield-check", category: "safety" },
  { name: "Background Checked Staff", icon: "user-check", category: "safety" },
  { name: "CPR/First Aid Certified", icon: "heart-pulse", category: "safety" },
  { name: "Security Cameras", icon: "camera", category: "safety" },
  { name: "Secure Entry", icon: "lock", category: "safety" },
  { name: "Fire Safety Compliant", icon: "flame", category: "safety" },

  // Facilities
  { name: "Outdoor Playground", icon: "trees", category: "facilities" },
  { name: "Indoor Play Area", icon: "blocks", category: "facilities" },
  { name: "Nap Room", icon: "moon", category: "facilities" },
  { name: "Library", icon: "book-open", category: "facilities" },
  { name: "Art Studio", icon: "palette", category: "facilities" },
  { name: "Music Room", icon: "music", category: "facilities" },
  { name: "Garden", icon: "flower-2", category: "facilities" },
  { name: "Swimming Pool", icon: "waves", category: "facilities" },

  // Programs
  { name: "STEM Curriculum", icon: "flask-conical", category: "programs" },
  { name: "Language Classes", icon: "languages", category: "programs" },
  { name: "Music & Dance", icon: "music-2", category: "programs" },
  { name: "Arts & Crafts", icon: "scissors", category: "programs" },
  { name: "Physical Education", icon: "dumbbell", category: "programs" },
  { name: "Montessori Method", icon: "puzzle", category: "programs" },
  { name: "Reggio Emilia", icon: "lightbulb", category: "programs" },
  { name: "Religious Education", icon: "church", category: "programs" },

  // Meals
  { name: "Breakfast Provided", icon: "coffee", category: "meals" },
  { name: "Lunch Provided", icon: "utensils", category: "meals" },
  { name: "Snacks Provided", icon: "apple", category: "meals" },
  { name: "Organic Food", icon: "leaf", category: "meals" },
  { name: "Allergy Accommodations", icon: "alert-triangle", category: "meals" },
  { name: "Vegetarian Options", icon: "salad", category: "meals" },

  // Services
  { name: "Transportation", icon: "bus", category: "services" },
  { name: "Extended Hours", icon: "clock", category: "services" },
  { name: "Weekend Care", icon: "calendar", category: "services" },
  { name: "Drop-in Care", icon: "calendar-plus", category: "services" },
  { name: "Before/After School", icon: "sun", category: "services" },
  { name: "Summer Program", icon: "sun", category: "services" },
  { name: "Holiday Care", icon: "gift", category: "services" },
  { name: "Special Needs Support", icon: "heart-handshake", category: "services" },
  { name: "Parent App", icon: "smartphone", category: "services" },
  { name: "Daily Reports", icon: "file-text", category: "services" },
];

export const AMENITY_CATEGORIES: Record<AmenityCategory, string> = {
  safety: "Safety & Security",
  facilities: "Facilities",
  programs: "Programs & Curriculum",
  meals: "Meals & Nutrition",
  services: "Services",
};

export function getAmenitiesByCategory(category: AmenityCategory): AmenityConfig[] {
  return AMENITIES.filter((a) => a.category === category);
}
