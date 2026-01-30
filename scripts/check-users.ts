import { db } from "../src/lib/db";

async function check() {
  const users = await db.user.findMany({
    where: {
      email: { in: ["test.parent@kindergarten.com", "test.owner@kindergarten.com"] }
    },
    select: {
      email: true,
      passwordHash: true,
      isActive: true,
      role: true,
    }
  });

  console.log("Users found:", users.length);
  users.forEach(u => {
    console.log("---");
    console.log("Email:", u.email);
    console.log("Role:", u.role);
    console.log("isActive:", u.isActive);
    console.log("Has passwordHash:", u.passwordHash ? "YES" : "NO");
    console.log("Hash preview:", u.passwordHash?.substring(0, 20) + "...");
  });

  await db.$disconnect();
}

check();
