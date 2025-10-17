import { pgTable, serial, varchar, timestamp, pgEnum, json, integer, date, primaryKey, type AnyPgColumn, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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

export const documentCategoryEnum = pgEnum('document_category', ['LEGAL', 'FINANCIAL', 'TECHNICAL', 'OTHER'])

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
  siren: varchar('siren', { length: 9 }).unique(),
  siret: varchar('siret', { length: 14 }).unique(),
  type: entityTypeEnum('type').notNull(),
  mode: entityModeEnum('mode').notNull(),
  parentGroupId: integer('parent_group_id').references((): AnyPgColumn => entities.id),
  oeId: integer('oe_id').references(() => oes.id),
  accountManagerId: integer('account_manager_id').references(() => accounts.id),
  createdBy: integer('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => accounts.id),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
})

export const audits = pgTable('audits', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => entities.id),
  oeId: integer('oe_id').notNull().references(() => oes.id),
  auditorId: integer('auditor_id').notNull().references(() => accounts.id),
  type: auditTypeEnum('type').notNull(),
  plannedDate: date('planned_date'),
  actualDate: date('actual_date'),
  score: integer('score'),
  labelingOpinion: json('labeling_opinion'),
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
  documentaryReviewId: integer('documentary_review_id').notNull().references(() => documentaryReviews.id),
  uploadAt: timestamp('upload_at').notNull().defaultNow(),
  minioKey: varchar('minio_key', { length: 512 }),
  mimeType: varchar('mime_type', { length: 255 }),
  uploadBy: integer('upload_by').notNull().references(() => accounts.id),
  updatedBy: integer('updated_by').references(() => accounts.id),
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
})

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

// ========================================
// Relations Drizzle pour les queries relationnelles
// ========================================

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  oe: one(oes, {
    fields: [accounts.oeId],
    references: [oes.id],
  }),
  accountsToEntities: many(accountsToEntities),
  audits: many(audits),
  auditorsToOE: many(auditorsToOE),
  documentaryReviews: many(documentaryReviews),
  documentVersions: many(documentVersions),
}))

export const oeRelations = relations(oes, ({ many }) => ({
  accounts: many(accounts),
  entities: many(entities),
  audits: many(audits),
  auditorsToOE: many(auditorsToOE),
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
}))

export const auditsRelations = relations(audits, ({ one }) => ({
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
  }),
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
  uploadByAccount: one(accounts, {
    fields: [documentVersions.uploadBy],
    references: [accounts.id],
  }),
}))
