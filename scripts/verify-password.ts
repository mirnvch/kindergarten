import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function verify() {
  const user = await db.user.findUnique({
    where: { email: "test.parent@kindergarten.com" },
    select: { passwordHash: true }
  });

  if (!user?.passwordHash) {
    console.log("User or password not found");
    return;
  }

  console.log("Stored hash:", user.passwordHash);

  const testPassword = "Test123!";
  const isValid = await bcrypt.compare(testPassword, user.passwordHash);

  console.log("Password 'Test123!' matches:", isValid);

  // Also test creating a new hash and comparing
  const newHash = await bcrypt.hash(testPassword, 10);
  console.log("New hash for same password:", newHash);

  const newValid = await bcrypt.compare(testPassword, newHash);
  console.log("New hash validates:", newValid);

  await db.$disconnect();
}

verify();
