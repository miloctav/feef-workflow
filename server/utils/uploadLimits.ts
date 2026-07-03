/**
 * Taille maximale autorisée pour un fichier uploadé (50 Mo).
 *
 * readMultipartFormData charge tout le fichier en mémoire : sans borne
 * applicative, un gros fichier (ou plusieurs) peut saturer la RAM du serveur.
 */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024

/**
 * Valide que la taille d'un fichier ne dépasse pas la limite autorisée.
 * @throws createError 413 si le fichier est trop volumineux
 */
export function assertUploadSize(size: number): void {
  if (size > MAX_UPLOAD_SIZE_BYTES) {
    const maxMb = Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))
    throw createError({
      statusCode: 413,
      message: `Fichier trop volumineux. Taille maximale autorisée : ${maxMb} Mo`,
    })
  }
}
