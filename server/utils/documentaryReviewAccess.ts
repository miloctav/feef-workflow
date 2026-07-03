import { Role } from '#shared/types/roles'
import { canAccessDocumentaryReviewCategory } from '#shared/types/enums'
import type { DocumentaryReviewCategoryType } from '#shared/types/enums'
import type { SessionUser } from '~~/server/types/session'

/**
 * Vérifie qu'un utilisateur a le droit de télécharger le fichier d'une revue
 * documentaire, au-delà du simple accès à l'entité.
 *
 * Deux contrôles supplémentaires, identiques à ceux du téléchargement groupé
 * (download-all), qui manquaient sur les téléchargements unitaires :
 * - un OE ne peut accéder à la revue documentaire que si l'entité l'a autorisé
 *   (entity.allowOeDocumentsAccess) ;
 * - la catégorie du document doit être accessible au rôle de l'utilisateur.
 *
 * @throws createError 403 si l'accès est refusé
 */
export function assertDocumentaryReviewDownloadAccess(
  user: SessionUser,
  documentaryReview: {
    category: DocumentaryReviewCategoryType
    entity?: { allowOeDocumentsAccess?: boolean | null } | null
  }
): void {
  // Un OE doit avoir l'autorisation explicite de l'entité
  if (
    user.role === Role.OE &&
    !documentaryReview.entity?.allowOeDocumentsAccess
  ) {
    throw createError({
      statusCode: 403,
      message: 'L\'entité n\'a pas autorisé l\'accès à sa revue documentaire',
    })
  }

  // La catégorie doit être accessible au rôle de l'utilisateur
  if (!canAccessDocumentaryReviewCategory(user.role, documentaryReview.category)) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas accès à cette catégorie de document',
    })
  }
}
