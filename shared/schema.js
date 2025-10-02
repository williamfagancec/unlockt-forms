const { pgTable, serial, varchar, boolean, timestamp, date } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  entraId: varchar('entra_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow()
});

const formSubmissions = pgTable('form_submissions', {
  id: serial('id').primaryKey(),
  strataManagement: varchar('strata_management', { length: 255 }).notNull(),
  strataPlanNumber: varchar('strata_plan_number', { length: 100 }).notNull(),
  streetAddress: varchar('street_address', { length: 255 }),
  streetAddressLine2: varchar('street_address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postal: varchar('postal', { length: 20 }),
  questionCheckbox1: boolean('question_checkbox_1').default(false),
  questionCheckbox2: boolean('question_checkbox_2').default(false),
  questionCheckbox3: boolean('question_checkbox_3').default(false),
  questionCheckbox4: boolean('question_checkbox_4').default(false),
  confirmationCheckbox: boolean('confirmation_checkbox').notNull(),
  submissionDate: date('submission_date').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow()
});

module.exports = {
  users,
  formSubmissions
};
