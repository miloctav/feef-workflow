import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { documentsType } from "~~/server/database/schema"
import { softDelete } from "~~/server/utils/softDelete"

/**
 * DELETE /api/documents-type/[id]
 *
 * Supprimer (soft delete) un document type
 *
 * Accessible par: FEEF uniquement
 */
export default defineEventHandler(async (event) => {

  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut supprimer des documents types',
    })
  }

  const documentTypeId = getRouterParam(event, 'id')

  const documentType = await db.query.documentsType.findFirst({
    where: eq(documentsType.id, parseInt(documentTypeId || '0'))
  })

  if (!documentType) {
    throw createError({
      statusCode: 404,
      message: 'Document type non trouvé'
    })
  }

  await softDelete(documentsType, eq(documentsType.id, parseInt(documentTypeId || '0')))

  return {
    success: true
  }
})
