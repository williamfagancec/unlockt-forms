const { db } = require('../infrastructure/database');
const { formSubmissions } = require('../../shared/schema');
const { eq, desc } = require('drizzle-orm');

class FormSubmissionRepository {
  async create(submissionData) {
    const [submission] = await db
      .insert(formSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  async findAll() {
    return await db
      .select()
      .from(formSubmissions)
      .orderBy(desc(formSubmissions.submittedAt));
  }

  async findById(id) {
    const [submission] = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.id, id));
    return submission;
  }

  async getAllForStats() {
    return await db.select().from(formSubmissions);
  }
}

module.exports = new FormSubmissionRepository();
