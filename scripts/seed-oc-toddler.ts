import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  console.log("Seeding OC Toddler School...");

  // Create daycare
  const daycare = await prisma.daycare.create({
    data: {
      slug: "oc-toddler-school-irvine",
      name: "OC Toddler School and Daycare",
      description: `A Montessori-based preschool and childcare facility emphasizing independence, creativity, and natural curiosity.

We've been nurturing young minds for over 10 years with more than 100 enrolled learners. Our approach combines the proven Montessori method with hands-on learning experiences that foster each child's natural development.

Key highlights:
• Full Montessori curriculum
• Low child-to-caregiver ratios
• Fresh, mostly organic meals and snacks provided daily
• Beautiful outdoor play areas
• Extended care options available

We are affiliated with the California Home Schooling Association, Association Montessori Internationale (AMI), American Montessori Society (AMS), and the Greater Irvine Chamber of Commerce.`,

      email: "info@octoddlerschool.com",
      phone: "(949) 484-9990",
      website: "https://www.octoddlerschool.com",

      address: "32 Grassland",
      city: "Irvine",
      state: "CA",
      zipCode: "92620",
      country: "US",

      // Coordinates for Irvine, CA (Woodbury area)
      latitude: 33.7175,
      longitude: -117.7595,

      capacity: 50,
      minAge: 12, // 12 months
      maxAge: 72, // 6 years

      openingTime: "07:00",
      closingTime: "18:00",
      operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],

      pricePerMonth: 1240,
      pricePerWeek: 350,
      pricePerDay: 80,
      registrationFee: 150,

      status: "APPROVED",
      isVerified: true,
      isFeatured: true,

      metaTitle: "OC Toddler School - Montessori Preschool in Irvine, CA",
      metaDescription:
        "Premier Montessori-based preschool and daycare in Irvine. Ages 12 months to 6 years. Organic meals, low ratios, nurturing environment.",
    },
  });

  console.log("Created daycare:", daycare.id);

  // Add programs
  const programs = await Promise.all([
    prisma.program.create({
      data: {
        daycareId: daycare.id,
        name: "Infant & Toddler Program",
        description:
          "For our youngest learners, we provide a nurturing environment that encourages exploration and development through sensory activities, music, and gentle guidance.",
        ageMin: 12,
        ageMax: 24,
        price: 1310,
        schedule: "Full-time (8:00 AM - 5:30 PM)",
      },
    }),
    prisma.program.create({
      data: {
        daycareId: daycare.id,
        name: "Pre-Montessori",
        description:
          "Bridge program preparing children for the Primary classroom. Focus on practical life skills, language development, and social interaction.",
        ageMin: 24,
        ageMax: 36,
        price: 1240,
        schedule: "Full-time (8:00 AM - 5:30 PM)",
      },
    }),
    prisma.program.create({
      data: {
        daycareId: daycare.id,
        name: "Primary Montessori",
        description:
          "Our flagship program featuring the complete Montessori curriculum including practical life, sensorial, language, mathematics, and cultural studies.",
        ageMin: 36,
        ageMax: 72,
        price: 1120,
        schedule: "Full-time (8:00 AM - 5:30 PM)",
      },
    }),
  ]);

  console.log("Created programs:", programs.length);

  // Add photos (using placeholder images)
  const photos = await Promise.all([
    prisma.daycarePhoto.create({
      data: {
        daycareId: daycare.id,
        url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800",
        alt: "Montessori classroom",
        isPrimary: true,
        order: 0,
      },
    }),
    prisma.daycarePhoto.create({
      data: {
        daycareId: daycare.id,
        url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800",
        alt: "Children learning",
        isPrimary: false,
        order: 1,
      },
    }),
    prisma.daycarePhoto.create({
      data: {
        daycareId: daycare.id,
        url: "https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800",
        alt: "Outdoor play area",
        isPrimary: false,
        order: 2,
      },
    }),
  ]);

  console.log("Created photos:", photos.length);

  // Link to amenities (if they exist)
  const amenityNames = [
    "Organic Meals",
    "Outdoor Playground",
    "Montessori Curriculum",
    "Extended Hours",
    "Small Class Sizes",
  ];

  for (const name of amenityNames) {
    const amenity = await prisma.amenity.findFirst({
      where: { name: { contains: name, mode: "insensitive" } },
    });

    if (amenity) {
      await prisma.daycareAmenity.create({
        data: {
          daycareId: daycare.id,
          amenityId: amenity.id,
        },
      });
      console.log("Linked amenity:", name);
    }
  }

  console.log("\nDone! Daycare URL: /daycare/oc-toddler-school-irvine");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
