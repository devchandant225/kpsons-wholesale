/**
 * CLI Script: Create Initial Admin User in MongoDB Atlas
 *
 * Usage:
 *   node scripts/create-admin.js admin@kpsonswholesale.com MySecurePassword123 "KP Admin"
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load .env.local / .env without the dotenv package (not a dependency).
// process.loadEnvFile needs Node 20.12+.
const fs = require('fs');
for (const file of ['.env.local', '.env']) {
  if (fs.existsSync(file) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(file);
    break;
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in environment or .env file.');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin User';

if (password && password.length < 12) {
  console.error('❌ Use an admin password of at least 12 characters.');
  process.exit(1);
}

if (!email || !password) {
  console.log('Usage: node scripts/create-admin.js <email> <password> [name]');
  console.log('Example: node scripts/create-admin.js admin@kpsonswholesale.com SecretPass2026! "Sales Desk"');
  process.exit(1);
}

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'REP'], default: 'ADMIN' },
  },
  { timestamps: true }
);

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

async function run() {
  console.log('⏳ Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);

  const existing = await AdminUser.findOne({ email: email.toLowerCase() });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = name;
    await existing.save();
    console.log(`✅ Admin user password updated for: ${email}`);
  } else {
    const admin = new AdminUser({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'ADMIN',
    });
    await admin.save();
    console.log(`✅ New Admin User created successfully for: ${email}`);
  }

  await mongoose.disconnect();
  console.log('🎉 Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error creating admin user:', err);
  process.exit(1);
});
