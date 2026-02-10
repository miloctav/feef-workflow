import { pgTable, serial, varchar, timestamp, pgEnum, json, jsonb, integer, date, primaryKey, type AnyPgColumn, boolean, text, numeric, index } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Define role enum
export const roleEnum = pgEnum('role', ['FEEF', 'OE', 'AUDITOR', 'ENTITY'])

// Define entity type enum
export const entityTypeEnum = pgEnum('entity_type', ['COMPANY', 'GROUP'])

// Define entity mode enum
export const entityModeEnum = pgEnum('entity_mode', ['MASTER', 'FOLLOWER'])

// Define audit type enum
export const auditTypeEnum = pgEnum('audit_type', ['INITIAL', 'RENEWAL', 'MONITORING'])

// Define oe role enum
export const oeRoleEnum = pgEnum('oe_role', ['ADMIN', 'ACCOUNT_MANAGER'])

// Define account-entity role enum
export const accountEntityRoleEnum = pgEnum('account_entity_role', ['SIGNATORY', 'PROCESS_MANAGER'])

export const documentCategoryEnum = pgEnum('document_category', ['CANDIDACY', 'AUDIT', 'OTHER', 'CORRECTIVE_ACTION_PROOF'])

// Define audit document type enum
export const auditDocumentTypeEnum = pgEnum('audit_document_type', ['PLAN', 'REPORT', 'SHORT_ACTION_PLAN', 'LONG_ACTION_PLAN', 'OE_OPINION', 'ATTESTATION'])

// Define action plan type enum
export const actionPlanTypeEnum = pgEnum('action_plan_type', ['NONE', 'SHORT', 'LONG'])

// Define signature type enum
export const signatureTypeEnum = pgEnum('signature_type', ['ENTITY_ONLY', 'ENTITY_AND_FEEF'])

// Define signature status enum
export const signatureStatusEnum = pgEnum('signature_status', ['DRAFT', 'PENDING_ENTITY', 'PENDING_FEEF', 'COMPLETED'])

// Define audit status enum
export const auditStatusEnum = pgEnum('audit_status', ['PENDING_CASE_APPROVAL', 'PENDING_OE_ACCEPTANCE', 'PENDING_OE_CHOICE', 'PLANNING', 'SCHEDULED', 'PENDING_REPORT', 'PENDING_CORRECTIVE_PLAN', 'PENDING_CORRECTIVE_PLAN_VALIDATION', 'PENDING_OE_OPINION', 'PENDING_FEEF_DECISION', 'COMPLETED', 'REFUSED_BY_OE', 'REFUSED_PLAN', 'PENDING_COMPLEMENTARY_AUDIT'])

// Define audit phase enum (for notation scoring)
export const auditPhaseEnum = pgEnum('audit_phase', ['PHASE_1', 'PHASE_2'])

// Define monitoring mode enum (for MONITORING audits only)
export const monitoringModeEnum = pgEnum('monitoring_mode', ['PHYSICAL', 'DOCUMENTARY'])

// Define OE opinion enum
export const oeOpinionEnum = pgEnum('oe_opinion', ['FAVORABLE', 'UNFAVORABLE', 'RESERVED'])

// Define FEEF decision enum
export const feefDecisionEnum = pgEnum('feef_decision', ['PENDING', 'ACCEPTED', 'REJECTED'])

// Define action type enum
export const actionTypeEnum = pgEnum('action_type', [
  // FEEF
  'FEEF_VALIDATE_CASE_SUBMISSION',
  'FEEF_VALIDATE_LABELING_DECISION',
  'FEEF_SIGN_CONTRACT',
  // ENTITY
  'ENTITY_SUBMIT_CASE',
  'ENTITY_MARK_DOCUMENTARY_REVIEW_READY',
  'ENTITY_CHOOSE_OE',
  'ENTITY_UPLOAD_REQUESTED_DOCUMENTS',
  'ENTITY_UPDATE_CASE_INFORMATION',
  'ENTITY_SIGN_FEEF_CONTRACT',
  'ENTITY_UPLOAD_CORRECTIVE_PLAN',
  // OE
  'OE_ACCEPT_OR_REFUSE_AUDIT',
  // Actions partagées OE/AUDITOR (fusionnées)
  'SET_AUDIT_DATES',
  'UPLOAD_AUDIT_PLAN',
  'UPLOAD_AUDIT_REPORT',
  'VALIDATE_CORRECTIVE_PLAN',
  'UPLOAD_LABELING_OPINION',
  // Complementary audit actions
  'SET_COMPLEMENTARY_AUDIT_DATES',
  'UPLOAD_COMPLEMENTARY_REPORT',
])

// Define action status enum
export const actionStatusEnum = pgEnum('action_status', [
  'PENDING',
  'COMPLETED',
  'CANCELLED'
])

// Define event type enum
export const eventTypeEnum = pgEnum('event_type', [
  // Audit workflow events
  'AUDIT_CASE_SUBMITTED',
  'AUDIT_CASE_APPROVED',
  'AUDIT_OE_ASSIGNED',
  'AUDIT_OE_ACCEPTED',
  'AUDIT_OE_REFUSED',
  'AUDIT_DATES_SET',
  'AUDIT_PLAN_UPLOADED',
  'AUDIT_REPORT_UPLOADED',
  'AUDIT_CORRECTIVE_PLAN_UPLOADED',
  'AUDIT_CORRECTIVE_PLAN_VALIDATED',
  'AUDIT_CORRECTIVE_PLAN_REFUSED',
  'AUDIT_COMPLEMENTARY_REQUESTED',
  'AUDIT_COMPLEMENTARY_DATES_SET',
  'AUDIT_COMPLEMENTARY_REPORT_UPLOADED',
  'AUDIT_OE_OPINION_TRANSMITTED',
  'AUDIT_FEEF_DECISION_ACCEPTED',
  'AUDIT_FEEF_DECISION_REJECTED',
  'AUDIT_ATTESTATION_GENERATED',
  'AUDIT_STATUS_CHANGED',

  // Entity events
  'ENTITY_DOCUMENTARY_REVIEW_READY',
  'ENTITY_OE_ASSIGNED',

  // Contract events
  'CONTRACT_ENTITY_SIGNED',
  'CONTRACT_FEEF_SIGNED',
])

// Define event category enum
export const eventCategoryEnum = pgEnum('event_category', [
  'AUDIT',
  'ENTITY',
  'CONTRACT',
  'SYSTEM',
])

// ========================================
// Import enum values and types from shared
// ========================================

export const oes = pgTable('oes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
})

export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  siret: varchar('siret', { length: 14 }).unique().notNull(),
  type: entityTypeEnum('type').notNull(),
  mode: entityModeEnum('mode').notNull(),
  parentGroupId: integer('parent_group_id').references((): AnyPgColumn => entities.id),
  oeId: integer('oe_id').references(() => oes.id),
  accountManagerId: integer('account_manager_id').references(() => accounts.id),
  allowOeDocumentsAccess: boolean('allow_oe_documents_access').notNull().default(false),
  // Address and contact fields
  address: varchar('address', { length: 255 }),
  addressComplement: varchar('address_complement', { length: 255 }),
  postalCode: varchar('postal_code', { length: 10 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const entityFieldVersions = pgTable('entity_field_versions', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  fieldKey: varchar('field_key', { length: 100 }).notNull(),
  // Colonnes pour chaque type de valeur (une seule remplie à la fois)
  valueString: text('value_string'),
  valueNumber: numeric('value_number'),
  valueBoolean: boolean('value_boolean'),
  valueDate: timestamp('value_date'),
  createdBy: integer('created_by').notNull().references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const audits = pgTable('audits', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  oeId: integer('oe_id').references(() => oes.id),
  auditorId: integer('auditor_id').references(() => accounts.id),
  externalAuditorName: varchar('external_auditor_name', { length: 255 }),
  type: auditTypeEnum('type').notNull(),
  monitoringMode: monitoringModeEnum('monitoring_mode'),
  plannedDate: date('planned_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  globalScore: integer('global_score'),
  labelingOpinion: json('labeling_opinion'),
  // Workflow status
  status: auditStatusEnum('status').default('PLANNING'),
  // OE Opinion fields
  oeOpinion: oeOpinionEnum('oe_opinion'),
  oeOpinionArgumentaire: text('oe_opinion_argumentaire'),
  oeOpinionConditions: text('oe_opinion_conditions'),
  // Action plan fields
  actionPlanType: actionPlanTypeEnum('action_plan_type').default('NONE'),
  actionPlanDeadline: timestamp('action_plan_deadline'),
  // FEEF Decision fields
  feefDecision: feefDecisionEnum('feef_decision'),
  labelExpirationDate: date('label_expiration_date'),
  attestationMetadata: jsonb('attestation_metadata').$type<{
    customScope?: string
    customExclusions?: string
    customCompanies?: string
  }>(),
  // OE Response fields (acceptance/refusal)
  oeAccepted: boolean('oe_accepted'),
  oeRefusalReason: text('oe_refusal_reason'),
  // Link to previous audit in case of refusal
  previousAuditId: integer('previous_audit_id').references((): AnyPgColumn => audits.id),
  // Complementary audit fields (phase 2)
  hasComplementaryAudit: boolean('has_complementary_audit').default(false),
  complementaryStartDate: date('complementary_start_date'),
  complementaryEndDate: date('complementary_end_date'),
  complementaryGlobalScore: integer('complementary_global_score'),
  planRefusalReason: text('plan_refusal_reason'),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  firstname: varchar('firstname', { length: 255 }).notNull(),
  lastname: varchar('lastname', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  role: roleEnum('role').notNull(),
  oeId: integer('oe_id').references(() => oes.id),
  oeRole: oeRoleEnum('oe_role'),
  currentEntityId: integer('current_entity_id').references((): AnyPgColumn => entities.id),
  passwordChangedAt: timestamp('password_changed_at'),

  // Email change tracking
  pendingEmail: varchar('pending_email', { length: 255 }),
  emailChangeRequestedAt: timestamp('email_change_requested_at'),

  isActive: boolean('is_active').notNull().default(false),
  emailNotificationsEnabled: boolean('email_notifications_enabled').notNull().default(true),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const twoFactorCodes = pgTable('two_factor_codes', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 7 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_two_factor_codes_account_id').on(table.accountId),
  index('idx_two_factor_codes_expires_at').on(table.expiresAt),
])

export const trustedDevices = pgTable('trusted_devices', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  label: varchar('label', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_trusted_devices_account_id').on(table.accountId),
  index('idx_trusted_devices_token_hash').on(table.tokenHash),
  index('idx_trusted_devices_expires_at').on(table.expiresAt),
])

export const documentsType = pgTable('documents_type', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 1024 }),
  category: documentCategoryEnum('category').notNull(),
  autoAsk: boolean('auto_ask').notNull().default(false),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const documentaryReviews = pgTable('documentary_reviews', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  documentTypeId: integer('document_type_id').references(() => documentsType.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 1024 }),
  category: documentCategoryEnum('category').notNull(),
  createdBy: integer('created_by').notNull().references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const documentVersions = pgTable('document_versions', {
  id: serial('id').primaryKey(),
  documentaryReviewId: integer('documentary_review_id').references(() => documentaryReviews.id),
  contractId: integer('contract_id').references(() => contracts.id),
  auditId: integer('audit_id').references(() => audits.id),
  auditDocumentType: auditDocumentTypeEnum('audit_document_type'),
  uploadAt: timestamp('upload_at').notNull().defaultNow(),
  s3Key: varchar('s3_key', { length: 512 }),
  mimeType: varchar('mime_type', { length: 255 }),
  uploadBy: integer('upload_by').notNull().references(() => accounts.id),
  askedBy: integer('asked_by').references(() => accounts.id),
  askedAt: timestamp('asked_at'),
  comment: text('comment'),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 1024 }),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  oeId: integer('oe_id').references(() => oes.id),
  // Signature fields
  requiresSignature: boolean('requires_signature').notNull().default(false),
  signatureType: signatureTypeEnum('signature_type'),
  signatureStatus: signatureStatusEnum('signature_status'),
  // Validity field
  validityEndDate: date('validity_end_date'),
  createdBy: integer('created_by').notNull().references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const auditNotation = pgTable('audit_notation', {
  id: serial('id').primaryKey(),
  auditId: integer('audit_id').notNull().references(() => audits.id),
  criterionKey: integer('criterion_key').notNull(),
  description: text('description').notNull(),
  score: integer('score').notNull(),
  phase: auditPhaseEnum('phase').notNull().default('PHASE_1'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Junction table for many-to-many relationship between accounts and entities
export const accountsToEntities = pgTable('accounts_to_entities', {
  accountId: integer('account_id').notNull().references(() => accounts.id),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  role: accountEntityRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.accountId, table.entityId] })
}))

// Junction table for many-to-many relationship between auditors and oe
export const auditorsToOE = pgTable('auditors_to_oe', {
  auditorId: integer('auditor_id').notNull().references(() => accounts.id),
  oeId: integer('oe_id').notNull().references(() => oes.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.auditorId, table.oeId] })
}))

// Actions table for workflow task management
export const actions = pgTable('actions', {
  id: serial('id').primaryKey(),

  // Type d'action
  type: actionTypeEnum('type').notNull(),

  // Liaisons contextuelles
  entityId: integer('entity_id').notNull().references(() => entities.id),
  auditId: integer('audit_id').references(() => audits.id), // Nullable pour actions entity-level

  // Assignation de rôles multiples (nouveau)
  assignedRoles: text('assigned_roles').array().notNull(), // Array natif PostgreSQL

  // Statut et timing
  status: actionStatusEnum('status').notNull().default('PENDING'),
  durationDays: integer('duration_days').notNull(), // Durée spécifique
  deadline: timestamp('deadline').notNull(), // Calculé: createdAt + durationDays

  // Tracking de complétion
  completedAt: timestamp('completed_at'),
  completedBy: integer('completed_by').references(() => accounts.id),

  // Métadonnées flexibles (JSON)
  metadata: json('metadata'),

  // Audit trail standard
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'), // Soft delete / annulation
}, (table) => [
  // Index pour filtrage par audit (critique pour le JOIN avec audits.oeId/auditorId)
  index('idx_actions_audit_id')
    .on(table.auditId)
    .where(sql`${table.deletedAt} IS NULL`),

  // Index pour filtrage par entité (utilisé par le rôle ENTITY)
  index('idx_actions_entity_id')
    .on(table.entityId)
    .where(sql`${table.deletedAt} IS NULL`),

  // Index composite pour tri par deadline (actions pending triées par échéance)
  index('idx_actions_status_deadline')
    .on(table.status, table.deadline)
    .where(sql`${table.deletedAt} IS NULL`),

  // Index composite pour détection de complétion (entity + audit + status)
  index('idx_actions_entity_audit_status')
    .on(table.entityId, table.auditId, table.status)
    .where(sql`${table.deletedAt} IS NULL`),
])

// Events table for audit trail
export const events = pgTable('events', {
  id: serial('id').primaryKey(),

  // Identification de l'événement
  type: eventTypeEnum('type').notNull(),
  category: eventCategoryEnum('category').notNull(),

  // Références polymorphiques (au moins une doit être remplie)
  auditId: integer('audit_id').references(() => audits.id),
  entityId: integer('entity_id').references(() => entities.id),
  contractId: integer('contract_id').references(() => contracts.id),

  // Qui et quand
  performedBy: integer('performed_by').notNull().references(() => accounts.id),
  performedAt: timestamp('performed_at').notNull().defaultNow(),

  // Contexte flexible (JSON)
  metadata: json('metadata'),
}, (table) => [
  // Index pour queries rapides
  index('idx_events_audit_id').on(table.auditId),
  index('idx_events_entity_id').on(table.entityId),
  index('idx_events_type').on(table.type),
  index('idx_events_category_date').on(table.category, table.performedAt),
  index('idx_events_performed_by').on(table.performedBy),
])

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),

  // Type de notification (extensible pour le futur)
  type: varchar('type', { length: 50 }).notNull(), // 'action_created', 'action_reminder', 'alert', etc.

  // Contenu
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),

  // Liens contextuels (optionnels)
  entityId: integer('entity_id').references(() => entities.id),
  auditId: integer('audit_id').references(() => audits.id),
  actionId: integer('action_id').references(() => actions.id),

  // Statut lu/non-lu
  readAt: timestamp('read_at'),

  // Email envoyé ?
  emailSent: boolean('email_sent').notNull().default(false),

  // Metadata extensible
  metadata: json('metadata'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_account_id').on(table.accountId),
  index('idx_notifications_account_read').on(table.accountId, table.readAt),
  index('idx_notifications_created_at').on(table.createdAt),
])

// ========================================
// Types inférés depuis le schéma Drizzle
// ========================================

// Type pour Account (sélection depuis la DB)
export type Account = typeof accounts.$inferSelect

// Type pour Account (insertion dans la DB)
export type NewAccount = typeof accounts.$inferInsert

// Type pour Entity
export type Entity = typeof entities.$inferSelect
export type NewEntity = typeof entities.$inferInsert

// Type pour OE (Organisme Évaluateur)
export type OE = typeof oes.$inferSelect
export type NewOE = typeof oes.$inferInsert

// Type pour Audit
export type Audit = typeof audits.$inferSelect
export type NewAudit = typeof audits.$inferInsert

// Type pour AccountToEntity
export type AccountToEntity = typeof accountsToEntities.$inferSelect
export type NewAccountToEntity = typeof accountsToEntities.$inferInsert

// Type pour AuditorToOE
export type AuditorToOE = typeof auditorsToOE.$inferSelect
export type NewAuditorToOE = typeof auditorsToOE.$inferInsert

// Type pour DocumentType
export type DocumentType = typeof documentsType.$inferSelect
export type NewDocumentType = typeof documentsType.$inferInsert

// Type pour DocumentaryReview
export type DocumentaryReview = typeof documentaryReviews.$inferSelect
export type NewDocumentaryReview = typeof documentaryReviews.$inferInsert

// Type pour DocumentVersion
export type DocumentVersion = typeof documentVersions.$inferSelect
export type NewDocumentVersion = typeof documentVersions.$inferInsert

// Type pour Contract
export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert

// Type pour EntityFieldVersion
export type EntityFieldVersion = typeof entityFieldVersions.$inferSelect
export type NewEntityFieldVersion = typeof entityFieldVersions.$inferInsert

// Type pour AuditNotation
export type AuditNotation = typeof auditNotation.$inferSelect
export type NewAuditNotation = typeof auditNotation.$inferInsert

// Type pour Action
export type Action = typeof actions.$inferSelect
export type NewAction = typeof actions.$inferInsert

// Type pour Event
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

// Type pour Notification
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

// Type pour TwoFactorCode
export type TwoFactorCode = typeof twoFactorCodes.$inferSelect
export type NewTwoFactorCode = typeof twoFactorCodes.$inferInsert

// Type pour TrustedDevice
export type TrustedDevice = typeof trustedDevices.$inferSelect
export type NewTrustedDevice = typeof trustedDevices.$inferInsert

// ========================================
// Relations Drizzle pour les queries relationnelles
// ========================================

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  oe: one(oes, {
    fields: [accounts.oeId],
    references: [oes.id],
  }),
  currentEntity: one(entities, {
    fields: [accounts.currentEntityId],
    references: [entities.id],
  }),
  accountsToEntities: many(accountsToEntities),
  audits: many(audits, {
    relationName: 'auditor',
  }),
  auditsCaseSubmitted: many(audits, {
    relationName: 'auditCaseSubmittedBy',
  }),
  auditsCaseApproved: many(audits, {
    relationName: 'auditCaseApprovedBy',
  }),
  auditsOEOpinion: many(audits, {
    relationName: 'oeOpinionTransmittedBy',
  }),
  auditsCorrectivePlan: many(audits, {
    relationName: 'correctivePlanValidatedBy',
  }),
  auditsFEEFDecision: many(audits, {
    relationName: 'feefDecisionBy',
  }),
  auditorsToOE: many(auditorsToOE),
  documentaryReviews: many(documentaryReviews),
  documentVersionsUploaded: many(documentVersions, {
    relationName: 'documentVersionUploadBy',
  }),
  documentVersionsAsked: many(documentVersions, {
    relationName: 'documentVersionAskedBy',
  }),
  documentVersionsUpdated: many(documentVersions, {
    relationName: 'documentVersionUpdatedBy',
  }),
  contractsCreated: many(contracts, {
    relationName: 'contractCreatedBy',
  }),
  contractsEntitySigned: many(contracts, {
    relationName: 'contractEntitySignedBy',
  }),
  contractsFeefSigned: many(contracts, {
    relationName: 'contractFeefSignedBy',
  }),
  contractsUpdated: many(contracts, {
    relationName: 'contractUpdatedBy',
  }),
  entityFieldVersions: many(entityFieldVersions),
  actionsCompleted: many(actions, {
    relationName: 'actionCompletedBy',
  }),
  actionsCreated: many(actions, {
    relationName: 'actionCreatedBy',
  }),
  eventsPerformed: many(events, {
    relationName: 'eventPerformedBy',
  }),
  twoFactorCodes: many(twoFactorCodes),
  trustedDevices: many(trustedDevices),
  notifications: many(notifications),
}))

export const oeRelations = relations(oes, ({ many }) => ({
  accounts: many(accounts),
  entities: many(entities),
  audits: many(audits),
  auditorsToOE: many(auditorsToOE),
  contracts: many(contracts),
}))

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  parentGroup: one(entities, {
    fields: [entities.parentGroupId],
    references: [entities.id],
    relationName: 'parentGroup',
  }),
  childEntities: many(entities, {
    relationName: 'parentGroup',
  }),
  oe: one(oes, {
    fields: [entities.oeId],
    references: [oes.id],
  }),
  accountManager: one(accounts, {
    fields: [entities.accountManagerId],
    references: [accounts.id],
  }),
  accountsToEntities: many(accountsToEntities),
  audits: many(audits),
  documentaryReviews: many(documentaryReviews),
  contracts: many(contracts),
  fieldVersions: many(entityFieldVersions),
  actions: many(actions),
  events: many(events),
}))

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  entity: one(entities, {
    fields: [contracts.entityId],
    references: [entities.id],
  }),
  oe: one(oes, {
    fields: [contracts.oeId],
    references: [oes.id],
  }),
  createdByAccount: one(accounts, {
    fields: [contracts.createdBy],
    references: [accounts.id],
    relationName: 'contractCreatedBy',
  }),
  updatedByAccount: one(accounts, {
    fields: [contracts.updatedBy],
    references: [accounts.id],
    relationName: 'contractUpdatedBy',
  }),
  documentVersions: many(documentVersions),
  events: many(events),
}))

export const auditsRelations = relations(audits, ({ one, many }) => ({
  entity: one(entities, {
    fields: [audits.entityId],
    references: [entities.id],
  }),
  oe: one(oes, {
    fields: [audits.oeId],
    references: [oes.id],
  }),
  auditor: one(accounts, {
    fields: [audits.auditorId],
    references: [accounts.id],
    relationName: 'auditor',
  }),
  previousAudit: one(audits, {
    fields: [audits.previousAuditId],
    references: [audits.id],
    relationName: 'previousAudit',
  }),
  documentVersions: many(documentVersions),
  notations: many(auditNotation),
  actions: many(actions),
  events: many(events),
}))

export const accountsToEntitiesRelations = relations(accountsToEntities, ({ one }) => ({
  account: one(accounts, {
    fields: [accountsToEntities.accountId],
    references: [accounts.id],
  }),
  entity: one(entities, {
    fields: [accountsToEntities.entityId],
    references: [entities.id],
  }),
}))

export const auditorsToOERelations = relations(auditorsToOE, ({ one }) => ({
  auditor: one(accounts, {
    fields: [auditorsToOE.auditorId],
    references: [accounts.id],
  }),
  oe: one(oes, {
    fields: [auditorsToOE.oeId],
    references: [oes.id],
  }),
}))

export const documentaryReviewsRelations = relations(documentaryReviews, ({ one, many }) => ({
  entity: one(entities, {
    fields: [documentaryReviews.entityId],
    references: [entities.id],
  }),
  documentType: one(documentsType, {
    fields: [documentaryReviews.documentTypeId],
    references: [documentsType.id],
  }),
  createdByAccount: one(accounts, {
    fields: [documentaryReviews.createdBy],
    references: [accounts.id],
  }),
  documentVersions: many(documentVersions),
}))

export const documentsTypeRelations = relations(documentsType, ({ many }) => ({
  documentaryReviews: many(documentaryReviews),
}))

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  documentaryReview: one(documentaryReviews, {
    fields: [documentVersions.documentaryReviewId],
    references: [documentaryReviews.id],
  }),
  contract: one(contracts, {
    fields: [documentVersions.contractId],
    references: [contracts.id],
  }),
  audit: one(audits, {
    fields: [documentVersions.auditId],
    references: [audits.id],
  }),
  uploadByAccount: one(accounts, {
    fields: [documentVersions.uploadBy],
    references: [accounts.id],
    relationName: 'documentVersionUploadBy',
  }),
  askedByAccount: one(accounts, {
    fields: [documentVersions.askedBy],
    references: [accounts.id],
    relationName: 'documentVersionAskedBy',
  }),
  updatedByAccount: one(accounts, {
    fields: [documentVersions.updatedBy],
    references: [accounts.id],
    relationName: 'documentVersionUpdatedBy',
  }),
}))

export const entityFieldVersionsRelations = relations(entityFieldVersions, ({ one }) => ({
  entity: one(entities, {
    fields: [entityFieldVersions.entityId],
    references: [entities.id],
  }),
  createdByAccount: one(accounts, {
    fields: [entityFieldVersions.createdBy],
    references: [accounts.id],
  }),
}))

export const auditNotationRelations = relations(auditNotation, ({ one }) => ({
  audit: one(audits, {
    fields: [auditNotation.auditId],
    references: [audits.id],
  }),
}))

export const actionsRelations = relations(actions, ({ one }) => ({
  entity: one(entities, {
    fields: [actions.entityId],
    references: [entities.id],
  }),
  audit: one(audits, {
    fields: [actions.auditId],
    references: [audits.id],
  }),
  completedByAccount: one(accounts, {
    fields: [actions.completedBy],
    references: [accounts.id],
    relationName: 'actionCompletedBy',
  }),
  createdByAccount: one(accounts, {
    fields: [actions.createdBy],
    references: [accounts.id],
    relationName: 'actionCreatedBy',
  }),
}))

export const eventsRelations = relations(events, ({ one }) => ({
  audit: one(audits, {
    fields: [events.auditId],
    references: [audits.id],
  }),
  entity: one(entities, {
    fields: [events.entityId],
    references: [entities.id],
  }),
  contract: one(contracts, {
    fields: [events.contractId],
    references: [contracts.id],
  }),
  performedByAccount: one(accounts, {
    fields: [events.performedBy],
    references: [accounts.id],
    relationName: 'eventPerformedBy',
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  account: one(accounts, { fields: [notifications.accountId], references: [accounts.id] }),
  entity: one(entities, { fields: [notifications.entityId], references: [entities.id] }),
  audit: one(audits, { fields: [notifications.auditId], references: [audits.id] }),
  action: one(actions, { fields: [notifications.actionId], references: [actions.id] }),
}))

export const twoFactorCodesRelations = relations(twoFactorCodes, ({ one }) => ({
  account: one(accounts, {
    fields: [twoFactorCodes.accountId],
    references: [accounts.id],
  }),
}))

export const trustedDevicesRelations = relations(trustedDevices, ({ one }) => ({
  account: one(accounts, {
    fields: [trustedDevices.accountId],
    references: [accounts.id],
  }),
}))
