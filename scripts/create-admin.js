require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../server/db');
const { adminUsers } = require('../shared/schema');
const { eq } = require('drizzle-orm');

async function createAdminUser() {
  try {
    const firstName = process.argv[2] || 'Admin';
    const lastName = process.argv[3] || 'User';
    const email = (process.argv[4] || 'admin@unlockt.com').toLowerCase().trim();
    const password = process.argv[5] || 'Admin@123456';
    const role = process.argv[6] || 'administrator';

    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    
    if (existing) {
      console.log(`User with email '${email}' already exists!`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(adminUsers).values({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);
    console.log('\n⚠️  Please save these credentials and change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
