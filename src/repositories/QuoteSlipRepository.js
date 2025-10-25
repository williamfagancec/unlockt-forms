const { db } = require('../infrastructure/database');
const { quoteSlipSubmissions } = require('../../shared/schema');
const { eq, desc } = require('drizzle-orm');

class QuoteSlipRepository {
  async create(submissionData) {
    const [submission] = await db
      .insert(quoteSlipSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  async findAll() {
    return await db
      .select()
      .from(quoteSlipSubmissions)
      .orderBy(desc(quoteSlipSubmissions.submittedAt));
  }

  async findById(id) {
    const [submission] = await db
      .select()
      .from(quoteSlipSubmissions)
      .where(eq(quoteSlipSubmissions.id, id));
    return submission;
  }

  async getAllForStats() {
    return await db.select().from(quoteSlipSubmissions);
  }
}

module.exports = new QuoteSlipRepository();
