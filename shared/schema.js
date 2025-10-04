const { pgTable, serial, varchar, boolean, timestamp, date, integer, index } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  entraId: varchar('entra_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  entraIdIdx: index('users_entra_id_idx').on(table.entraId),
  emailIdx: index('users_email_idx').on(table.email)
}));

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
  questionCheckbox5: boolean('question_checkbox_5').default(false),
  confirmationCheckbox: boolean('confirmation_checkbox').notNull(),
  submissionDate: date('submission_date').notNull(),
  commonSealFile: varchar('common_seal_file', { length: 500 }),
  letterHeadFile: varchar('letter_head_file', { length: 500 }),
  signatureFile: varchar('signature_file', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow()
}, (table) => ({
  submittedAtIdx: index('form_submissions_submitted_at_idx').on(table.submittedAt),
  strataPlanNumberIdx: index('form_submissions_strata_plan_number_idx').on(table.strataPlanNumber),
  submissionDateIdx: index('form_submissions_submission_date_idx').on(table.submissionDate)
}));

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
  currentBuildingSumInsured: varchar('current_building_sum_insured', { length: 100 }),
  requestedSumInsured: varchar('requested_sum_insured', { length: 100 }),
  roofType: varchar('roof_type', { length: 255 }),
  externalWallType: varchar('external_wall_type', { length: 255 }),
  floorType: varchar('floor_type', { length: 255 }),
  buildingType: varchar('building_type', { length: 255 }),
  yearBuilt: varchar('year_built', { length: 10 }),
  numberOfLots: varchar('number_of_lots', { length: 20 }),
  numberOfFloors: varchar('number_of_floors', { length: 20 }),
  facilityPoolsSpas: boolean('facility_pools_spas').default(false),
  facilityJetty: boolean('facility_jetty').default(false),
  facilityFireSafetySystems: boolean('facility_fire_safety_systems').default(false),
  facilityPlayground: boolean('facility_playground').default(false),
  facilityLake: boolean('facility_lake').default(false),
  facilitySprinklers: boolean('facility_sprinklers').default(false),
  facilityGym: boolean('facility_gym').default(false),
  facilityWaterFeature: boolean('facility_water_feature').default(false),
  facilityEvCharges: boolean('facility_ev_charges').default(false),
  facilityTennisCourt: boolean('facility_tennis_court').default(false),
  facilityCarStacker: boolean('facility_car_stacker').default(false),
  requiredCoverFlood: boolean('required_cover_flood').default(false),
  discloseInsuranceDeclined: boolean('disclose_insurance_declined').default(false),
  discloseAsbestosPresent: boolean('disclose_asbestos_present').default(false),
  discloseHeritageListed: boolean('disclose_heritage_listed').default(false),
  numberOfLifts: varchar('number_of_lifts', { length: 20 }),
  acpEpsPresent: varchar('acp_eps_present', { length: 10 }),
  acpEpsName: varchar('acp_eps_name', { length: 255 }),
  currentStandardExcess: varchar('current_standard_excess', { length: 100 }),
  coverOfficeBearers: boolean('cover_office_bearers').default(false),
  coverMachineryBreakdown: boolean('cover_machinery_breakdown').default(false),
  coverCatastrophe: boolean('cover_catastrophe').default(false),
  coverOfficeBearersValue: varchar('cover_office_bearers_value', { length: 255 }),
  coverMachineryBreakdownValue: varchar('cover_machinery_breakdown_value', { length: 255 }),
  coverCatastropheValue: varchar('cover_catastrophe_value', { length: 255 }),
  defectsAffectingProperty: varchar('defects_affecting_property', { length: 10 }),
  afssCurrent: varchar('afss_current', { length: 10 }),
  residentialLessThan20Commercial: varchar('residential_less_than_20_commercial', { length: 10 }),
  majorWorksOver500k: varchar('major_works_over_500k', { length: 10 }),
  defectsRelevantDocsFile: varchar('defects_relevant_docs_file', { length: 500 }),
  whsFile: varchar('whs_file', { length: 500 }),
  claimsHistoryFile: varchar('claims_history_file', { length: 500 }),
  strataPlansFile: varchar('strata_plans_file', { length: 500 }),
  asbestosReportFile: varchar('asbestos_report_file', { length: 500 }),
  commercialTenantListFile: varchar('commercial_tenant_list_file', { length: 500 }),
  mostRecentValuationFile: varchar('most_recent_valuation_file', { length: 500 }),
  preventativeMaintenanceProgramFile: varchar('preventative_maintenance_program_file', { length: 500 }),
  declarationAuthorised: boolean('declaration_authorised'),
  declarationAppointUnlockt: boolean('declaration_appoint_unlockt'),
  declarationAccurateInfo: boolean('declaration_accurate_info'),
  declarationStrataManager: boolean('declaration_strata_manager'),
  declarationTrueAnswers: boolean('declaration_true_answers'),
  declarationFullName: varchar('declaration_full_name', { length: 255 }),
  declarationPosition: varchar('declaration_position', { length: 255 }),
  confirmDisclosures: varchar('confirm_disclosures', { length: 50 }),
  signatureFile: varchar('signature_file', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow()
}, (table) => ({
  submittedAtIdx: index('quote_slip_submissions_submitted_at_idx').on(table.submittedAt),
  strataPlanNumberIdx: index('quote_slip_submissions_strata_plan_number_idx').on(table.strataPlanNumber),
  renewalDateIdx: index('quote_slip_submissions_renewal_date_idx').on(table.renewalDate),
  currentInsurerIdx: index('quote_slip_submissions_current_insurer_idx').on(table.currentInsurer)
}));

const insurers = pgTable('insurers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  isActiveIdx: index('insurers_is_active_idx').on(table.isActive),
  displayOrderIdx: index('insurers_display_order_idx').on(table.displayOrder)
}));

const roofTypes = pgTable('roof_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  isActiveIdx: index('roof_types_is_active_idx').on(table.isActive),
  displayOrderIdx: index('roof_types_display_order_idx').on(table.displayOrder)
}));

const externalWallTypes = pgTable('external_wall_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  isActiveIdx: index('external_wall_types_is_active_idx').on(table.isActive),
  displayOrderIdx: index('external_wall_types_display_order_idx').on(table.displayOrder)
}));

const floorTypes = pgTable('floor_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  isActiveIdx: index('floor_types_is_active_idx').on(table.isActive),
  displayOrderIdx: index('floor_types_display_order_idx').on(table.displayOrder)
}));

const buildingTypes = pgTable('building_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  isActiveIdx: index('building_types_is_active_idx').on(table.isActive),
  displayOrderIdx: index('building_types_display_order_idx').on(table.displayOrder)
}));

const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull().default('viewer'),
  isActive: boolean('is_active').default(true).notNull(),
  onboardingToken: varchar('onboarding_token', { length: 255 }),
  onboardingTokenExpiry: timestamp('onboarding_token_expiry'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('admin_users_email_idx').on(table.email),
  isActiveIdx: index('admin_users_is_active_idx').on(table.isActive),
  onboardingTokenIdx: index('admin_users_onboarding_token_idx').on(table.onboardingToken)
}));

module.exports = {
  users,
  formSubmissions,
  quoteSlipSubmissions,
  insurers,
  roofTypes,
  externalWallTypes,
  floorTypes,
  buildingTypes,
  adminUsers
};
