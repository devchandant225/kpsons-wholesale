/**
 * CLI Script: Create (or reset the password of) a staff admin user in Postgres.
 *
 * Usage:
 *   node scripts/create-admin.js admin@kpsonswholesale.com MySecurePassword123 "KP Admin"
 *
 * Run `npx prisma migrate deploy` first so the tables exist.
 */

const fs = require('fs');

// Load .env.local / .env without the dotenv package (not a dependency).
// process.loadEnvFile needs Node 20.12+.
for (const file of ['.env.local', '.env']) {
  if (fs.existsSync(file) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(file);
    break;
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in environment or .env file.');
  process.exit(1);
}

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const email = (process.argv[2] || '').trim().toLowerCase();
const password = process.argv[3];
const name = process.argv[4] || 'Admin User';

if (!email || !password) {
  console.log('Usage: node scripts/create-admin.js <email> <password> [name]');
  console.log('Example: node scripts/create-admin.js admin@kpsonswholesale.com SecretPass2026! "Sales Desk"');
  process.exit(1);
}

if (password.length < 12) {
  console.error('❌ Use an admin password of at least 12 characters.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function run() {
  console.log('⏳ Connecting to Postgres...');
  const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name, role: 'ADMIN' },
  });

  console.log(existing ? `✅ Admin user password updated for: ${email}` : `✅ New Admin User created for: ${email}`);
}

run()
  .then(() => prisma.$disconnect())
  .then(() => {
    console.log('🎉 Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error creating admin user:', err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
