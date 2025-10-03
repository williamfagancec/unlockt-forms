const { pgTable, serial, varchar, boolean, timestamp, date, integer } = require('drizzle-orm/pg-core');

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
  commonSealFile: varchar('common_seal_file', { length: 500 }),
  letterHeadFile: varchar('letter_head_file', { length: 500 }),
  signatureFile: varchar('signature_file', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow()
});

const quoteSlipSubmissions = pgTable('quote_slip_submissions', {
  id: serial('id').primaryKey(),
  strataManagementName: varchar('strata_management_name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }).notNull(),
  strataPlanNumber: varchar('strata_plan_number', { length: 100 }).notNull(),
  currentCocFile: varchar('current_coc_file', { length: 500 }),
  address: varchar('address', { length: 500 }),
  streetAddressLine2: varchar('street_address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postal: varchar('postal', { length: 20 }),
  renewalDate: date('renewal_date').notNull(),
  currentInsurer: varchar('current_insurer', { length: 255 }),
  currentBuildingSumInsured: varchar('current_building_sum_insured', { length: 50 }),
  requestedSumInsured: varchar('requested_sum_insured', { length: 50 }),
  submittedAt: timestamp('submitted_at').defaultNow()
});

const insurers = pgTable('insurers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow()
});

module.exports = {
  users,
  formSubmissions,
  quoteSlipSubmissions,
  insurers
};
