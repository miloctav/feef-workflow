import { db } from '~~/server/database'
import { documentVersions, entities, documentaryReviews } from '~~/server/database/schema'
import { eq, and, isNull, isNotNull, desc } from 'drizzle-orm'
import { getSignedUrl } from '~~/server/services/garage'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'
import { DocumentaryReviewCategoryLabels, canAccessDocumentaryReviewCategory } from '#shared/types/enums'
import archiver from 'archiver'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID de l'entité depuis les params
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'ID invalide',
    })
  }

  const entityId = Number(id)

  // Vérifier l'accès à l'entité
  await requireEntityAccess({
    user,
    entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès aux documents de cette entité'
  })

  // Récupérer l'entité pour vérifier allowOeDocumentsAccess si OE
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérification spécifique pour OE
  if (user.role === Role.OE && !entity.allowOeDocumentsAccess) {
    throw createError({
      statusCode: 403,
      message: 'L\'entité n\'a pas autorisé l\'accès à sa revue documentaire',
    })
  }

  // Récupérer tous les documentary reviews de l'entité avec leurs dernières versions
  const documentaryReviewsList = await db.query.documentaryReviews.findMany({
    where: and(
      eq(documentaryReviews.entityId, entityId),
      isNull(documentaryReviews.deletedAt)
    ),
    with: {
      documentVersions: {
        where: and(
          isNotNull(documentVersions.s3Key), // Seulement les versions avec fichier
          isNull(documentVersions.askedBy)   // Exclure les demandes en attente
        ),
        orderBy: [desc(documentVersions.uploadAt)],
        limit: 1, // Seulement la dernière version
      },
    },
  })

  // Filtrer pour garder uniquement les documents de catégories accessibles et avec au moins une version
  const documentsWithVersions = documentaryReviewsList.filter(
    doc => canAccessDocumentaryReviewCategory(user.role, doc.category) &&
           doc.documentVersions && doc.documentVersions.length > 0
  )

  if (documentsWithVersions.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Aucun document disponible pour cette entité',
    })
  }

  try {
    // Créer un nom de fichier pour le ZIP
    const date = new Date()
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-')
    const zipFilename = `Revue_documentaire_${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_${formattedDate}.zip`

    // Configurer les headers de réponse
    setHeaders(event, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFilename}"`,
      'Cache-Control': 'no-cache',
    })

    // Créer l'archive ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression maximale
    })

    // Gérer les erreurs de l'archive
    archive.on('error', (err) => {
      console.error('Erreur lors de la création du ZIP:', err)
      throw createError({
        statusCode: 500,
        message: 'Erreur lors de la création de l\'archive',
      })
    })

    // Stream l'archive vers la réponse
    archive.pipe(event.node.res)

    // Ajouter chaque document au ZIP
    for (const doc of documentsWithVersions) {
      const latestVersion = doc.documentVersions[0]

      if (!latestVersion || !latestVersion.s3Key) continue

      try {
        // Générer l'URL signée
        const signedUrl = await getSignedUrl(latestVersion.s3Key)

        // Fetch le fichier depuis Garage
        const fileResponse = await fetch(signedUrl)

        if (!fileResponse.ok) {
          console.error(`Erreur lors du téléchargement du document ${doc.title}`)
          continue // Passer au suivant en cas d'erreur
        }

        // Convertir la réponse en Buffer (archiver ne supporte pas ReadableStream)
        const arrayBuffer = await fileResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Déterminer le nom du dossier de catégorie
        const categoryFolder = DocumentaryReviewCategoryLabels[doc.category] || 'AUTRE'

        // Extraire l'extension du nom de fichier original
        const originalFilename = latestVersion.s3Key.split('/').pop() || 'document'
        const extension = originalFilename.split('.').pop() || 'pdf'

        // Construire le nom du fichier dans le ZIP
        const filename = `${doc.title}.${extension}`

        // Ajouter le fichier au ZIP dans le dossier de catégorie
        archive.append(buffer, {
          name: `${categoryFolder}/${filename}`
        })
      } catch (error) {
        console.error(`Erreur lors de l'ajout du document ${doc.title} au ZIP:`, error)
        // Continuer avec les autres fichiers
      }
    }

    // Finaliser l'archive
    await archive.finalize()

    // L'archive est automatiquement envoyée au client via le pipe
    return event.node.res
  } catch (error) {
    console.error('Erreur lors de la création du ZIP:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la création de l\'archive',
    })
  }
})
