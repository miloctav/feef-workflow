import { type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { H3Event } from 'h3';
import { db } from '../database';
import { forDelete } from './tracking';

/**
 * Performs a soft delete by setting deletedAt to current timestamp
 * Also tracks who performed the deletion using tracking fields
 * @param event The H3 event containing the user context
 * @param table The Drizzle table to soft delete from
 * @param condition The WHERE condition (typically eq(table.id, id))
 * @returns The soft deleted record(s)
 */
export async function softDelete<T extends PgTable>(
  event: H3Event,
  table: T,
  condition: SQL
) {
  return db
    .update(table)
    .set(forDelete(event))
    .where(condition)
    .returning();
}
