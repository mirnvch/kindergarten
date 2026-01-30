import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function createTestUsers() {
  // Create Parent
  const parentPassword = await bcrypt.hash("Test123!", 10);
  const parent = await db.user.upsert({
    where: { email: "test.parent@kindergarten.com" },
    update: {},
    create: {
      email: "test.parent@kindergarten.com",
      passwordHash: parentPassword,
      firstName: "Test",
      lastName: "Parent",
      role: "PARENT",
      emailVerified: new Date(),
    },
  });
  console.log("✅ Parent created:", parent.email);

  // Create Daycare Owner
  const ownerPassword = await bcrypt.hash("Test123!", 10);
  const owner = await db.user.upsert({
    where: { email: "test.owner@kindergarten.com" },
    update: {},
    create: {
      email: "test.owner@kindergarten.com",
      passwordHash: ownerPassword,
      firstName: "Test",
      lastName: "Owner",
      role: "DAYCARE_OWNER",
      emailVerified: new Date(),
    },
  });
  console.log("✅ Owner created:", owner.email);

  // Link owner to a daycare (find first approved one)
  const daycare = await db.daycare.findFirst({
    where: { status: "APPROVED" },
  });

  if (daycare) {
    await db.daycareStaff.upsert({
      where: {
        daycareId_userId: {
          daycareId: daycare.id,
          userId: owner.id,
        },
      },
      update: {},
      create: {
        daycareId: daycare.id,
        userId: owner.id,
        role: "owner",
      },
    });
    console.log("✅ Owner linked to daycare:", daycare.name);
  } else {
    console.log("⚠️ No approved daycare found to link owner");
  }

  console.log("\n📋 Test Credentials:");
  console.log("---------------------------");
  console.log("Parent:  test.parent@kindergarten.com / Test123!");
  console.log("Owner:   test.owner@kindergarten.com / Test123!");

  await db.$disconnect();
}

createTestUsers().catch(console.error);
