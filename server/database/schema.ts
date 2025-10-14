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

// ========================================
// Export enum values as constants
// ========================================

export const Role = {
  FEEF: 'FEEF',
  OE: 'OE',
  AUDITOR: 'AUDITOR',
  ENTITY: 'ENTITY',
} as const

export const OERole = {
  ADMIN: 'ADMIN',
  ACCOUNT_MANAGER: 'ACCOUNT_MANAGER',
} as const

export const EntityRole = {
  SIGNATORY: 'SIGNATORY',
  PROCESS_MANAGER: 'PROCESS_MANAGER',
} as const

export const EntityType = {
  COMPANY: 'COMPANY',
  GROUP: 'GROUP',
} as const

export const EntityMode = {
  MASTER: 'MASTER',
  FOLLOWER: 'FOLLOWER',
} as const

export const AuditType = {
  INITIAL: 'INITIAL',
  RENEWAL: 'RENEWAL',
  MONITORING: 'MONITORING',
} as const

// Types pour les enums (pour TypeScript)
export type RoleType = typeof Role[keyof typeof Role]
export type OERoleType = typeof OERole[keyof typeof OERole]
export type EntityRoleType = typeof EntityRole[keyof typeof EntityRole]
export type EntityTypeType = typeof EntityType[keyof typeof EntityType]
export type EntityModeType = typeof EntityMode[keyof typeof EntityMode]
export type AuditTypeType = typeof AuditType[keyof typeof AuditType]

export const oes = pgTable('oes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  siren: varchar('siren', { length: 9 }).notNull().unique(),
  siret: varchar('siret', { length: 14 }).notNull().unique(),
  type: entityTypeEnum('type').notNull(),
  mode: entityModeEnum('mode').notNull(),
  parentGroupId: integer('parent_group_id').references((): AnyPgColumn => entities.id),
  oeId: integer('oe_id').references(() => oes.id),
  accountManagerId: integer('account_manager_id').references(() => accounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
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
