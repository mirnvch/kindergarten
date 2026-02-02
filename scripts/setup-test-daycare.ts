import { db } from "../src/lib/db";

async function setup() {
  // Find the provider owner
  const owner = await db.user.findUnique({
    where: { email: "test.provider@docconnect.com" },
  });

  if (!owner) {
    // Try legacy email
    const legacyOwner = await db.user.findUnique({
      where: { email: "test.owner@kindergarten.com" },
    });
    if (!legacyOwner) {
      console.log("Owner not found. Run create-test-users.ts first.");
      return;
    }
  }

  const ownerId = owner?.id;
  if (!ownerId) {
    console.log("Owner ID not found");
    return;
  }

  // Create or find provider
  let provider = await db.provider.findFirst({
    where: { slug: "test-provider" },
  });

  if (!provider) {
    provider = await db.provider.create({
      data: {
        slug: "test-provider",
        name: "Test Medical Practice",
        description: "A test medical practice for development and testing",
        email: "test@provider.com",
        phone: "555-1234",
        address: "123 Test Street",
        city: "Irvine",
        state: "CA",
        zipCode: "92602",
        latitude: 33.6846,
        longitude: -117.8265,
        specialty: "Family Medicine",
        credentials: "MD",
        consultationFee: 150,
        openingTime: "08:00",
        closingTime: "17:00",
        operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        status: "APPROVED",
        acceptingNewPatients: true,
      },
    });
    console.log("✅ Provider created:", provider.name);
  } else {
    // Update to approved if not already
    provider = await db.provider.update({
      where: { id: provider.id },
      data: { status: "APPROVED" },
    });
    console.log("✅ Provider found and approved:", provider.name);
  }

  // Link owner to provider
  await db.providerStaff.upsert({
    where: {
      providerId_userId: {
        providerId: provider.id,
        userId: ownerId,
      },
    },
    update: {},
    create: {
      providerId: provider.id,
      userId: ownerId,
      role: "owner",
    },
  });
  console.log("✅ Owner linked to provider");

  console.log("\n🔗 Test the provider at:");
  console.log("http://localhost:3000/provider/test-provider");

  await db.$disconnect();
}

setup().catch(console.error);
