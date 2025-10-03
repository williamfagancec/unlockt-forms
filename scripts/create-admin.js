require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../server/db');
const { adminUsers } = require('../shared/schema');
const { eq } = require('drizzle-orm');

async function createAdminUser() {
  try {
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'Admin@123456';
    const email = process.argv[4] || 'admin@unlockt.com';
    const role = process.argv[5] || 'administrator';

    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    
    if (existing) {
      console.log(`User '${username}' already exists!`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(adminUsers).values({
      username,
      email,
      passwordHash,
      role,
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log('\n⚠️  Please save these credentials and change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
