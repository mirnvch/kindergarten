import { db } from "../src/lib/db";

async function setup() {
  // Find the owner
  const owner = await db.user.findUnique({
    where: { email: "test.owner@kindergarten.com" },
  });

  if (!owner) {
    console.log("Owner not found");
    return;
  }

  // Create or find daycare
  let daycare = await db.daycare.findFirst({
    where: { slug: "test-daycare" },
  });

  if (!daycare) {
    daycare = await db.daycare.create({
      data: {
        slug: "test-daycare",
        name: "Test Daycare Center",
        description: "A test daycare for development and testing real-time messaging",
        email: "test@daycare.com",
        phone: "555-1234",
        address: "123 Test Street",
        city: "Irvine",
        state: "CA",
        zipCode: "92602",
        latitude: 33.6846,
        longitude: -117.8265,
        capacity: 50,
        minAge: 6,
        maxAge: 60,
        pricePerMonth: 1500,
        openingTime: "07:00",
        closingTime: "18:00",
        operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        status: "APPROVED",
      },
    });
    console.log("✅ Daycare created:", daycare.name);
  } else {
    // Update to approved if not already
    daycare = await db.daycare.update({
      where: { id: daycare.id },
      data: { status: "APPROVED" },
    });
    console.log("✅ Daycare found and approved:", daycare.name);
  }

  // Link owner to daycare
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
  console.log("✅ Owner linked to daycare");

  console.log("\n🔗 Test the chat at:");
  console.log("https://kindergarten-lime.vercel.app/daycare/test-daycare");

  await db.$disconnect();
}

setup().catch(console.error);
