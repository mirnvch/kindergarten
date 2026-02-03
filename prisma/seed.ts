import { PrismaClient, UserRole, ProviderStatus, AppointmentStatus, AppointmentType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

// Use the same initialization as the project
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Common US insurance providers
const INSURANCE_PROVIDERS = [
  "Aetna",
  "Anthem Blue Cross",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "UnitedHealthcare",
  "Medicare",
  "Medicaid",
];

// Medical specialties (for future use when specialty filtering is implemented)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SPECIALTIES = [
  "Family Medicine",
  "Internal Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Psychiatry",
  "OB/GYN",
  "Neurology",
  "Ophthalmology",
];

// Facilities/Amenities
const FACILITIES_DATA = [
  { name: "Wheelchair Accessible", category: "Accessibility" },
  { name: "Elevator", category: "Accessibility" },
  { name: "Parking Available", category: "Convenience" },
  { name: "Public Transit Nearby", category: "Convenience" },
  { name: "Online Check-in", category: "Technology" },
  { name: "Telehealth Available", category: "Technology" },
  { name: "Same Day Appointments", category: "Services" },
  { name: "Walk-ins Welcome", category: "Services" },
  { name: "Lab On-Site", category: "Services" },
  { name: "Pharmacy On-Site", category: "Services" },
  { name: "X-Ray On-Site", category: "Services" },
  { name: "Spanish Speaking Staff", category: "Languages" },
  { name: "Mandarin Speaking Staff", category: "Languages" },
];

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data
  console.log("Cleaning existing data...");
  await prisma.appointment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.providerFacility.deleteMany();
  await prisma.service.deleteMany();
  await prisma.providerPhoto.deleteMany();
  await prisma.providerSchedule.deleteMany();
  await prisma.providerStaff.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.user.deleteMany();

  // Create facilities
  console.log("Creating facilities...");
  const facilities = await Promise.all(
    FACILITIES_DATA.map((f) =>
      prisma.facility.create({
        data: { name: f.name, category: f.category },
      })
    )
  );

  // Create password hash
  const passwordHash = await hash("Test123!", 12);

  // Create admin user
  console.log("Creating admin user...");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _admin = await prisma.user.create({
    data: {
      email: "admin@docconnect.com",
      firstName: "Admin",
      lastName: "User",
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  });

  // Create test patients
  console.log("Creating test patients...");
  const patients = await Promise.all([
    prisma.user.create({
      data: {
        email: "john.patient@example.com",
        firstName: "John",
        lastName: "Smith",
        passwordHash,
        role: UserRole.PATIENT,
        emailVerified: new Date(),
        phone: "+1 (555) 123-4567",
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah.patient@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        passwordHash,
        role: UserRole.PATIENT,
        emailVerified: new Date(),
        phone: "+1 (555) 234-5678",
      },
    }),
    prisma.user.create({
      data: {
        email: "mike.patient@example.com",
        firstName: "Mike",
        lastName: "Williams",
        passwordHash,
        role: UserRole.PATIENT,
        emailVerified: new Date(),
        phone: "+1 (555) 345-6789",
      },
    }),
  ]);

  // Create family members for patients
  console.log("Creating family members...");
  await prisma.familyMember.create({
    data: {
      patientId: patients[0].id,
      firstName: "Emma",
      lastName: "Smith",
      dateOfBirth: new Date("2015-03-15"),
      relationship: "child",
      gender: "Female",
    },
  });

  await prisma.familyMember.create({
    data: {
      patientId: patients[1].id,
      firstName: "Robert",
      lastName: "Johnson",
      dateOfBirth: new Date("1955-08-22"),
      relationship: "parent",
      gender: "Male",
      conditions: "Diabetes Type 2",
      medications: "Metformin 500mg",
    },
  });

  // Create provider users
  console.log("Creating provider users...");
  const providerUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "dr.martinez@example.com",
        firstName: "Maria",
        lastName: "Martinez",
        passwordHash,
        role: UserRole.PROVIDER,
        emailVerified: new Date(),
        phone: "+1 (555) 456-7890",
      },
    }),
    prisma.user.create({
      data: {
        email: "dr.chen@example.com",
        firstName: "David",
        lastName: "Chen",
        passwordHash,
        role: UserRole.PROVIDER,
        emailVerified: new Date(),
        phone: "+1 (555) 567-8901",
      },
    }),
    prisma.user.create({
      data: {
        email: "dr.wilson@example.com",
        firstName: "Jennifer",
        lastName: "Wilson",
        passwordHash,
        role: UserRole.PROVIDER,
        emailVerified: new Date(),
        phone: "+1 (555) 678-9012",
      },
    }),
  ]);

  // Create providers (doctors/clinics)
  console.log("Creating providers...");
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        name: "Dr. Maria Martinez, MD",
        slug: "dr-maria-martinez",
        description: "Board-certified Family Medicine physician with over 15 years of experience. Specializing in preventive care, chronic disease management, and pediatric care.",
        specialty: "Family Medicine",
        credentials: "MD, FAAFP",
        email: "dr.martinez@example.com",
        phone: "+1 (555) 456-7890",
        website: "https://drmartinez.example.com",
        address: "123 Medical Center Dr, Suite 100",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90001",
        latitude: 34.0522,
        longitude: -118.2437,
        openingTime: "08:00",
        closingTime: "17:00",
        operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        status: ProviderStatus.APPROVED,
        isVerified: true,
        offersTelehealth: true,
        consultationFee: 150,
        telehealthFee: 100,
        acceptedInsurance: ["Aetna", "Blue Cross Blue Shield", "UnitedHealthcare", "Medicare"],
        acceptsMedicare: true,
        acceptsMedicaid: false,
        acceptsUninsured: true,
        languages: ["English", "Spanish"],
      },
    }),
    prisma.provider.create({
      data: {
        name: "Dr. David Chen, MD",
        slug: "dr-david-chen",
        description: "Experienced Cardiologist specializing in heart disease prevention, cardiac imaging, and interventional procedures.",
        specialty: "Cardiology",
        credentials: "MD, FACC",
        email: "dr.chen@example.com",
        phone: "+1 (555) 567-8901",
        address: "456 Heart Health Blvd",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
        latitude: 37.7749,
        longitude: -122.4194,
        openingTime: "09:00",
        closingTime: "18:00",
        operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        status: ProviderStatus.APPROVED,
        isVerified: true,
        isFeatured: true,
        offersTelehealth: true,
        consultationFee: 250,
        telehealthFee: 175,
        acceptedInsurance: ["Cigna", "Humana", "Kaiser Permanente", "Medicare"],
        acceptsMedicare: true,
        acceptsMedicaid: true,
        languages: ["English", "Mandarin"],
      },
    }),
    prisma.provider.create({
      data: {
        name: "Westside Pediatrics",
        slug: "westside-pediatrics",
        description: "Comprehensive pediatric care for children from birth through adolescence. Our team of caring providers focuses on your child's physical, emotional, and developmental health.",
        specialty: "Pediatrics",
        email: "info@westsidepediatrics.example.com",
        phone: "+1 (555) 678-9012",
        website: "https://westsidepediatrics.example.com",
        address: "789 Children's Way",
        city: "Irvine",
        state: "CA",
        zipCode: "92618",
        latitude: 33.6846,
        longitude: -117.8265,
        openingTime: "08:00",
        closingTime: "19:00",
        operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        status: ProviderStatus.APPROVED,
        isVerified: true,
        offersTelehealth: true,
        consultationFee: 125,
        telehealthFee: 85,
        acceptedInsurance: INSURANCE_PROVIDERS.slice(0, 6),
        acceptsMedicare: false,
        acceptsMedicaid: true,
        acceptsUninsured: true,
        slidingScalePricing: true,
        languages: ["English", "Spanish", "Vietnamese"],
      },
    }),
  ]);

  // Link provider users to providers
  console.log("Creating provider staff...");
  await Promise.all([
    prisma.providerStaff.create({
      data: {
        providerId: providers[0].id,
        userId: providerUsers[0].id,
        role: "owner",
      },
    }),
    prisma.providerStaff.create({
      data: {
        providerId: providers[1].id,
        userId: providerUsers[1].id,
        role: "owner",
      },
    }),
    prisma.providerStaff.create({
      data: {
        providerId: providers[2].id,
        userId: providerUsers[2].id,
        role: "owner",
      },
    }),
  ]);

  // Create services for providers
  console.log("Creating services...");
  await Promise.all([
    // Dr. Martinez services
    prisma.service.create({
      data: {
        providerId: providers[0].id,
        name: "Annual Physical Exam",
        description: "Comprehensive wellness exam including vitals, lab work review, and preventive care counseling",
        duration: 45,
        price: 150,
        isTelehealth: false,
      },
    }),
    prisma.service.create({
      data: {
        providerId: providers[0].id,
        name: "Sick Visit",
        description: "Evaluation and treatment for acute illnesses",
        duration: 20,
        price: 100,
        isTelehealth: false,
      },
    }),
    prisma.service.create({
      data: {
        providerId: providers[0].id,
        name: "Telehealth Consultation",
        description: "Virtual visit for follow-ups, medication refills, and minor concerns",
        duration: 15,
        price: 75,
        isTelehealth: true,
      },
    }),
    // Dr. Chen services
    prisma.service.create({
      data: {
        providerId: providers[1].id,
        name: "Cardiac Consultation",
        description: "Comprehensive heart health evaluation including EKG and risk assessment",
        duration: 60,
        price: 250,
        isTelehealth: false,
      },
    }),
    prisma.service.create({
      data: {
        providerId: providers[1].id,
        name: "Echocardiogram",
        description: "Ultrasound imaging of the heart",
        duration: 45,
        price: 400,
        isTelehealth: false,
      },
    }),
    // Westside Pediatrics services
    prisma.service.create({
      data: {
        providerId: providers[2].id,
        name: "Well Child Visit",
        description: "Routine checkup including growth monitoring, vaccinations, and developmental screening",
        duration: 30,
        price: 125,
        isTelehealth: false,
      },
    }),
    prisma.service.create({
      data: {
        providerId: providers[2].id,
        name: "Sick Child Visit",
        description: "Same-day appointments for acute childhood illnesses",
        duration: 20,
        price: 100,
        isTelehealth: false,
      },
    }),
  ]);

  // Add facilities to providers
  console.log("Adding facilities to providers...");
  const facilityIds = facilities.map((f) => f.id);
  await Promise.all([
    ...facilityIds.slice(0, 8).map((facilityId) =>
      prisma.providerFacility.create({
        data: { providerId: providers[0].id, facilityId },
      })
    ),
    ...facilityIds.slice(2, 10).map((facilityId) =>
      prisma.providerFacility.create({
        data: { providerId: providers[1].id, facilityId },
      })
    ),
    ...facilityIds.map((facilityId) =>
      prisma.providerFacility.create({
        data: { providerId: providers[2].id, facilityId },
      })
    ),
  ]);

  // Create schedules
  console.log("Creating schedules...");
  for (const provider of providers) {
    // Create schedule for Mon-Fri (dayOfWeek 1-5)
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      await prisma.providerSchedule.create({
        data: {
          providerId: provider.id,
          dayOfWeek,
          openTime: provider.openingTime,
          closeTime: provider.closingTime,
          isClosed: false,
        },
      });
    }
  }

  // Create sample appointments
  console.log("Creating sample appointments...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  await Promise.all([
    prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        providerId: providers[0].id,
        type: AppointmentType.IN_PERSON,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: tomorrow,
        duration: 45,
        reasonForVisit: "Annual physical exam",
        isNewPatient: true,
        confirmedAt: new Date(),
      },
    }),
    prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        providerId: providers[1].id,
        type: AppointmentType.IN_PERSON,
        status: AppointmentStatus.PENDING,
        scheduledAt: nextWeek,
        duration: 60,
        reasonForVisit: "Heart palpitations, follow-up from ER visit",
        symptoms: "Occasional chest discomfort, shortness of breath during exercise",
        isNewPatient: true,
      },
    }),
    prisma.appointment.create({
      data: {
        patientId: patients[2].id,
        providerId: providers[0].id,
        type: AppointmentType.TELEMEDICINE,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        duration: 15,
        reasonForVisit: "Medication refill - blood pressure",
        isNewPatient: false,
        isTelemedicine: true,
        confirmedAt: new Date(),
      },
    }),
  ]);

  // Create sample reviews
  console.log("Creating sample reviews...");
  await Promise.all([
    prisma.review.create({
      data: {
        userId: patients[0].id,
        providerId: providers[0].id,
        rating: 5,
        title: "Excellent care and attention",
        content: "Dr. Martinez took the time to listen to all my concerns and explained everything clearly. The staff was friendly and the office was clean. Highly recommend!",
        isVerified: true,
      },
    }),
    prisma.review.create({
      data: {
        userId: patients[1].id,
        providerId: providers[1].id,
        rating: 5,
        title: "Top-notch cardiologist",
        content: "Dr. Chen is incredibly knowledgeable and thorough. He explained my test results in detail and created a comprehensive treatment plan. The wait time was minimal.",
        isVerified: true,
      },
    }),
    prisma.review.create({
      data: {
        userId: patients[2].id,
        providerId: providers[2].id,
        rating: 4,
        title: "Great with kids",
        content: "The pediatricians here are wonderful with children. My daughter actually looks forward to her checkups! Only minor issue is parking can be tricky.",
        isVerified: true,
      },
    }),
  ]);

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Test accounts created:");
  console.log("  Admin: admin@docconnect.com / Test123!");
  console.log("  Patient: john.patient@example.com / Test123!");
  console.log("  Patient: sarah.patient@example.com / Test123!");
  console.log("  Provider: dr.martinez@example.com / Test123!");
  console.log("  Provider: dr.chen@example.com / Test123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
