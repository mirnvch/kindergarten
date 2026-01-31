import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL,
  });

  try {
    // Check if admin exists
    const existing = await pool.query(
      'SELECT id, email, role FROM "User" WHERE email = $1',
      ['admin@kindergarten.com']
    );

    if (existing.rows.length > 0) {
      console.log('Admin already exists:', existing.rows[0].email, existing.rows[0].role);
      return;
    }

    const passwordHash = await bcrypt.hash('Admin123!', 12);
    const id = `admin-${randomUUID()}`;

    await pool.query(`
      INSERT INTO "User" (
        id, email, "passwordHash", "firstName", "lastName",
        role, "emailVerified", "isActive", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), true, NOW(), NOW())
    `, [id, 'admin@kindergarten.com', passwordHash, 'System', 'Admin', 'ADMIN']);

    console.log('✅ Admin created successfully!');
    console.log('Email: admin@kindergarten.com');
    console.log('Password: Admin123!');
    console.log('Role: ADMIN');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
