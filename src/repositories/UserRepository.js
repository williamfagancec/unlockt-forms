const { db } = require('../infrastructure/database');
const { users } = require('../../shared/schema');
const { eq } = require('drizzle-orm');

class UserRepository {
  async findByEntraId(entraId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.entraId, entraId));
    return user;
  }

  async create(userData) {
    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();
    return newUser;
  }
}

module.exports = new UserRepository();
