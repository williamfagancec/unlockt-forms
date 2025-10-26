const { db } = require('../infrastructure/database');
const { adminUsers } = require('../../shared/schema');
const { eq, and, ne, gt, sql } = require('drizzle-orm');

class AdminUserRepository {
  async findByEmail(email) {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));
    return user;
  }

  async findById(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return null;
    }
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, numericId));
    return user;
  }

  async findByOnboardingToken(token, expiryDate) {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.onboardingToken, token),
          gt(adminUsers.onboardingTokenExpiry, expiryDate)
        )
      );
    return user;
  }

  async findAll() {
    return await db
      .select({
        id: adminUsers.id,
        firstName: adminUsers.firstName,
        lastName: adminUsers.lastName,
        email: adminUsers.email,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        isFrozen: adminUsers.isFrozen,
        failedLoginAttempts: adminUsers.failedLoginAttempts,
        createdAt: adminUsers.createdAt,
        updatedAt: adminUsers.updatedAt,
        onboardingTokenExpiry: adminUsers.onboardingTokenExpiry
      })
      .from(adminUsers);
  }

  async create(userData) {
    const [newUser] = await db
      .insert(adminUsers)
      .values(userData)
      .returning();
    return newUser;
  }

  async update(id, updates) {
    await db
      .update(adminUsers)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id));
  }

  async emailExistsExcludingUser(email, userId) {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.email, email),
          ne(adminUsers.id, userId)
        )
      );
    return !!user;
  }

  async incrementFailedLoginAttempts(id) {
    await db
      .update(adminUsers)
      .set({
        failedLoginAttempts: sql`${adminUsers.failedLoginAttempts} + 1`,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id));
  }

  async resetFailedLoginAttempts(id) {
    await db
      .update(adminUsers)
      .set({
        failedLoginAttempts: 0,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id));
  }

  async freezeAccount(id) {
    await db
      .update(adminUsers)
      .set({
        isFrozen: true,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id));
  }

  async unfreezeAccount(id) {
    await db
      .update(adminUsers)
      .set({
        isFrozen: false,
        failedLoginAttempts: 0,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id));
  }

  async setActive(id, isActive) {
    await db
      .update(adminUsers)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id));
  }
}

module.exports = new AdminUserRepository();
