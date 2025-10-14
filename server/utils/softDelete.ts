import { eq, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { db } from '../database';

/**
 * Performs a soft delete by setting deletedAt to current timestamp
 * @param table The Drizzle table to soft delete from
 * @param condition The WHERE condition (typically eq(table.id, id))
 * @returns The soft deleted record(s)
 */
export async function softDelete<T extends PgTable>(
  table: T,
  condition: SQL
) {
  return db
    .update(table)
    .set({ deletedAt: new Date() })
    .where(condition)
    .returning();
}
