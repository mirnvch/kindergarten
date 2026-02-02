import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function createTestUsers() {
  // Create Patient (was Parent)
  const patientPassword = await bcrypt.hash("Test123!", 10);
  const patient = await db.user.upsert({
    where: { email: "test.patient@docconnect.com" },
    update: {},
    create: {
      email: "test.patient@docconnect.com",
      passwordHash: patientPassword,
      firstName: "Test",
      lastName: "Patient",
      role: "PATIENT",
      emailVerified: new Date(),
    },
  });
  console.log("✅ Patient created:", patient.email);

  // Create Provider Owner (was Daycare Owner)
  const ownerPassword = await bcrypt.hash("Test123!", 10);
  const owner = await db.user.upsert({
    where: { email: "test.provider@docconnect.com" },
    update: {},
    create: {
      email: "test.provider@docconnect.com",
      passwordHash: ownerPassword,
      firstName: "Test",
      lastName: "Provider",
      role: "PROVIDER",
      emailVerified: new Date(),
    },
  });
  console.log("✅ Provider created:", owner.email);

  // Link owner to a provider (find first approved one)
  const provider = await db.provider.findFirst({
    where: { status: "APPROVED" },
  });

  if (provider) {
    await db.providerStaff.upsert({
      where: {
        providerId_userId: {
          providerId: provider.id,
          userId: owner.id,
        },
      },
      update: {},
      create: {
        providerId: provider.id,
        userId: owner.id,
        role: "owner",
      },
    });
    console.log("✅ Owner linked to provider:", provider.name);
  } else {
    console.log("⚠️ No approved provider found to link owner");
  }

  console.log("\n📋 Test Credentials:");
  console.log("---------------------------");
  console.log("Patient:  test.patient@docconnect.com / Test123!");
  console.log("Provider: test.provider@docconnect.com / Test123!");

  await db.$disconnect();
}

createTestUsers().catch(console.error);
