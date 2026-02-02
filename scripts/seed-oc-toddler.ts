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
  console.log("Seeding sample medical provider...");

  // Create provider (medical practice)
  const provider = await prisma.provider.create({
    data: {
      slug: "irvine-family-medicine",
      name: "Irvine Family Medicine Center",
      description: `A patient-centered family medicine practice serving the Irvine community.

We've been providing comprehensive healthcare for over 15 years. Our approach combines modern medical practices with personalized care to help families achieve optimal health.

Services:
• Annual physicals and wellness exams
• Preventive care and vaccinations
• Chronic disease management
• Minor procedures and urgent care
• Telemedicine appointments available

We accept most major insurance plans and offer affordable self-pay options.`,

      email: "info@irvinefamilymed.com",
      phone: "(949) 555-1234",
      website: "https://www.irvinefamilymed.com",

      address: "123 Medical Center Drive",
      city: "Irvine",
      state: "CA",
      zipCode: "92620",
      country: "US",

      // Coordinates for Irvine, CA
      latitude: 33.7175,
      longitude: -117.7595,

      specialty: "Family Medicine",
      subspecialty: "Preventive Care",
      credentials: "MD, FAAFP",
      npi: "1234567890",
      education: "Stanford University School of Medicine",
      experience: 15,
      languages: ["English", "Spanish"],

      offersTelehealth: true,
      teleHealthPlatform: "doxy.me",

      acceptedInsurance: ["Aetna", "Blue Cross Blue Shield", "Cigna", "UnitedHealthcare", "Medicare"],
      acceptsMedicaid: false,
      acceptsMedicare: true,

      consultationFee: 150,
      telehealthFee: 100,
      acceptsUninsured: true,
      slidingScalePricing: true,

      openingTime: "08:00",
      closingTime: "17:00",
      operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],

      status: "APPROVED",
      isVerified: true,
      isFeatured: true,
      acceptingNewPatients: true,

      metaTitle: "Irvine Family Medicine - Primary Care in Irvine, CA",
      metaDescription:
        "Trusted family medicine practice in Irvine offering comprehensive care, telehealth visits, and accepting most insurance plans.",
    },
  });

  console.log("Created provider:", provider.id);

  // Add services (replacing programs)
  const services = await Promise.all([
    prisma.service.create({
      data: {
        providerId: provider.id,
        name: "Annual Physical Exam",
        description:
          "Comprehensive annual wellness exam including vital signs, physical examination, health screening, and preventive care discussion.",
        duration: 45,
        price: 150,
        isTelehealth: false,
      },
    }),
    prisma.service.create({
      data: {
        providerId: provider.id,
        name: "Sick Visit",
        description:
          "Same-day or next-day appointment for acute illnesses such as cold, flu, infections, or other sudden health concerns.",
        duration: 20,
        price: 100,
        isTelehealth: false,
      },
    }),
    prisma.service.create({
      data: {
        providerId: provider.id,
        name: "Telehealth Consultation",
        description:
          "Virtual video visit for follow-ups, medication management, or health concerns that don't require in-person examination.",
        duration: 20,
        price: 75,
        isTelehealth: true,
      },
    }),
    prisma.service.create({
      data: {
        providerId: provider.id,
        name: "Chronic Care Management",
        description:
          "Ongoing management of chronic conditions like diabetes, hypertension, or heart disease. Monthly check-ins and care coordination.",
        duration: 30,
        price: 125,
        isTelehealth: false,
      },
    }),
  ]);

  console.log("Created services:", services.length);

  // Add photos (using placeholder images)
  const photos = await Promise.all([
    prisma.providerPhoto.create({
      data: {
        providerId: provider.id,
        url: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800",
        caption: "Modern medical office",
        isPrimary: true,
        order: 0,
      },
    }),
    prisma.providerPhoto.create({
      data: {
        providerId: provider.id,
        url: "https://images.unsplash.com/photo-1666214280250-41f16e09a7c2?w=800",
        caption: "Consultation room",
        isPrimary: false,
        order: 1,
      },
    }),
    prisma.providerPhoto.create({
      data: {
        providerId: provider.id,
        url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
        caption: "Reception area",
        isPrimary: false,
        order: 2,
      },
    }),
  ]);

  console.log("Created photos:", photos.length);

  // Link to facilities (if they exist)
  const facilityNames = [
    "Wheelchair Accessible",
    "Free Parking",
    "Private Exam Rooms",
    "Lab On-Site",
    "Electronic Health Records",
  ];

  for (const name of facilityNames) {
    const facility = await prisma.facility.findFirst({
      where: { name: { contains: name, mode: "insensitive" } },
    });

    if (facility) {
      await prisma.providerFacility.create({
        data: {
          providerId: provider.id,
          facilityId: facility.id,
        },
      });
      console.log("Linked facility:", name);
    }
  }

  console.log("\nDone! Provider URL: /provider/irvine-family-medicine");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
