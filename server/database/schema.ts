import { pgTable, serial, varchar, timestamp, pgEnum, json, integer, date, primaryKey, type AnyPgColumn, boolean, text, numeric, index } from 'drizzle-orm/pg-core'
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

export const documentCategoryEnum = pgEnum('document_category', ['CANDIDACY', 'AUDIT', 'OTHER'])

// Define audit document type enum
export const auditDocumentTypeEnum = pgEnum('audit_document_type', ['PLAN', 'REPORT', 'CORRECTIVE_PLAN', 'OE_OPINION', 'ATTESTATION'])

// Define signature type enum
export const signatureTypeEnum = pgEnum('signature_type', ['ENTITY_ONLY', 'ENTITY_AND_FEEF'])

// Define signature status enum
export const signatureStatusEnum = pgEnum('signature_status', ['DRAFT', 'PENDING_ENTITY', 'PENDING_FEEF', 'COMPLETED'])

// Define audit status enum
export const auditStatusEnum = pgEnum('audit_status', ['PENDING_CASE_APPROVAL', 'PENDING_OE_CHOICE', 'PLANNING', 'SCHEDULED', 'PENDING_REPORT', 'PENDING_CORRECTIVE_PLAN', 'PENDING_CORRECTIVE_PLAN_VALIDATION', 'PENDING_OE_OPINION', 'PENDING_FEEF_DECISION', 'COMPLETED'])

// Define OE opinion enum
export const oeOpinionEnum = pgEnum('oe_opinion', ['FAVORABLE', 'UNFAVORABLE', 'RESERVED'])

// Define FEEF decision enum
export const feefDecisionEnum = pgEnum('feef_decision', ['PENDING', 'ACCEPTED', 'REJECTED'])

// Define action type enum
export const actionTypeEnum = pgEnum('action_type', [
  // FEEF
  'FEEF_VALIDATE_CASE_SUBMISSION',
  'FEEF_VALIDATE_LABELING_DECISION',
  // ENTITY
  'ENTITY_SUBMIT_CASE',
  'ENTITY_MARK_DOCUMENTARY_REVIEW_READY',
  'ENTITY_CHOOSE_OE',
  'ENTITY_UPLOAD_REQUESTED_DOCUMENTS',
  'ENTITY_UPDATE_CASE_INFORMATION',
  'ENTITY_SIGN_FEEF_CONTRACT',
  'ENTITY_UPLOAD_CORRECTIVE_PLAN',
  'ENTITY_UPDATE_DOCUMENT',
  // Actions partagées OE/AUDITOR (fusionnées)
  'SET_AUDIT_DATES',
  'UPLOAD_AUDIT_PLAN',
  'UPLOAD_AUDIT_REPORT',
  'VALIDATE_CORRECTIVE_PLAN',
  'UPLOAD_LABELING_OPINION',
])

// Define action status enum
export const actionStatusEnum = pgEnum('action_status', [
  'PENDING',
  'COMPLETED',
  'CANCELLED'
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
  documentaryReviewReadyAt: timestamp('documentary_review_ready_at'),
  documentaryReviewReadyBy: integer('documentary_review_ready_by').references(() => accounts.id),
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
  updatedAt: timestamp('updated_at'),
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
  type: auditTypeEnum('type').notNull(),
  plannedDate: date('planned_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  globalScore: integer('global_score'),
  labelingOpinion: json('labeling_opinion'),
  // Workflow status
  status: auditStatusEnum('status').default('PLANNING'),
  // Case submission/approval fields
  caseSubmittedAt: timestamp('case_submitted_at'),
  caseSubmittedBy: integer('case_submitted_by').references(() => accounts.id),
  caseApprovedAt: timestamp('case_approved_at'),
  caseApprovedBy: integer('case_approved_by').references(() => accounts.id),
  // OE Opinion fields
  oeOpinion: oeOpinionEnum('oe_opinion'),
  oeOpinionArgumentaire: text('oe_opinion_argumentaire'),
  oeOpinionConditions: text('oe_opinion_conditions'),
  oeOpinionTransmittedAt: timestamp('oe_opinion_transmitted_at'),
  oeOpinionTransmittedBy: integer('oe_opinion_transmitted_by').references(() => accounts.id),
  // Corrective plan validation
  needsCorrectivePlan: boolean('needs_corrective_plan').default(false),
  correctivePlanValidatedAt: timestamp('corrective_plan_validated_at'),
  correctivePlanValidatedBy: integer('corrective_plan_validated_by').references(() => accounts.id),
  // FEEF Decision fields
  feefDecision: feefDecisionEnum('feef_decision'),
  feefDecisionAt: timestamp('feef_decision_at'),
  feefDecisionBy: integer('feef_decision_by').references(() => accounts.id),
  labelExpirationDate: date('label_expiration_date'),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at'),
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
  isActive: boolean('is_active').notNull().default(false),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
})

export const documentsType = pgTable('documents_type', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 1024 }),
  category: documentCategoryEnum('category').notNull(),
  autoAsk: boolean('auto_ask').notNull().default(false),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at'),
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
  updatedAt: timestamp('updated_at'),
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
  updatedAt: timestamp('updated_at'),
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
  entitySignedAt: timestamp('entity_signed_at'),
  entitySignedBy: integer('entity_signed_by').references(() => accounts.id),
  feefSignedAt: timestamp('feef_signed_at'),
  feefSignedBy: integer('feef_signed_by').references(() => accounts.id),
  createdBy: integer('created_by').notNull().references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
})

export const auditNotation = pgTable('audit_notation', {
  id: serial('id').primaryKey(),
  auditId: integer('audit_id').notNull().references(() => audits.id),
  criterionKey: integer('criterion_key').notNull(),
  description: text('description').notNull(),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
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
  updatedAt: timestamp('updated_at'),
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
  documentaryReviewReadyByAccount: one(accounts, {
    fields: [entities.documentaryReviewReadyBy],
    references: [accounts.id],
  }),
  accountsToEntities: many(accountsToEntities),
  audits: many(audits),
  documentaryReviews: many(documentaryReviews),
  contracts: many(contracts),
  fieldVersions: many(entityFieldVersions),
  actions: many(actions),
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
  entitySignedByAccount: one(accounts, {
    fields: [contracts.entitySignedBy],
    references: [accounts.id],
    relationName: 'contractEntitySignedBy',
  }),
  feefSignedByAccount: one(accounts, {
    fields: [contracts.feefSignedBy],
    references: [accounts.id],
    relationName: 'contractFeefSignedBy',
  }),
  updatedByAccount: one(accounts, {
    fields: [contracts.updatedBy],
    references: [accounts.id],
    relationName: 'contractUpdatedBy',
  }),
  documentVersions: many(documentVersions),
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
  caseSubmittedByAccount: one(accounts, {
    fields: [audits.caseSubmittedBy],
    references: [accounts.id],
    relationName: 'auditCaseSubmittedBy',
  }),
  caseApprovedByAccount: one(accounts, {
    fields: [audits.caseApprovedBy],
    references: [accounts.id],
    relationName: 'auditCaseApprovedBy',
  }),
  oeOpinionTransmittedByAccount: one(accounts, {
    fields: [audits.oeOpinionTransmittedBy],
    references: [accounts.id],
    relationName: 'oeOpinionTransmittedBy',
  }),
  correctivePlanValidatedByAccount: one(accounts, {
    fields: [audits.correctivePlanValidatedBy],
    references: [accounts.id],
    relationName: 'correctivePlanValidatedBy',
  }),
  feefDecisionByAccount: one(accounts, {
    fields: [audits.feefDecisionBy],
    references: [accounts.id],
    relationName: 'feefDecisionBy',
  }),
  documentVersions: many(documentVersions),
  notations: many(auditNotation),
  actions: many(actions),
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
