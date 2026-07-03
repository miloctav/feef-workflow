/**
 * Déterminer le type MIME à partir du nom de fichier
 * @param filename - Nom du fichier avec extension
 * @returns Type MIME
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'odt': 'application/vnd.oasis.opendocument.text',
    'ods': 'application/vnd.oasis.opendocument.spreadsheet',
    'odp': 'application/vnd.oasis.opendocument.presentation',

    // Texte
    'txt': 'text/plain',
    'csv': 'text/csv',
    'rtf': 'application/rtf',

    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',

    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',

    // Autres
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
  }

  return ext && mimeTypes[ext] ? mimeTypes[ext] : 'application/octet-stream'
}

/**
 * Extensions de fichiers autorisées à l'upload (documents métier).
 *
 * On exclut volontairement les formats exécutables dans le navigateur
 * (html, svg, js, css, xml, json, ico) : servis depuis le domaine de
 * l'application, ils permettraient un XSS stocké.
 */
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  // Documents bureautiques
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'odt', 'ods', 'odp', 'rtf',
  // Texte
  'txt', 'csv',
  // Images matricielles (pas de SVG)
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
  // Archives
  'zip',
])

/**
 * Retourne l'extension normalisée (minuscule, sans point) d'un nom de fichier.
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Valide qu'un fichier a une extension autorisée à l'upload.
 * @throws createError 400 si l'extension n'est pas autorisée
 */
export function assertAllowedUploadExtension(filename: string): void {
  const ext = getFileExtension(filename)

  if (!ext || !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    throw createError({
      statusCode: 400,
      message: `Type de fichier non autorisé. Formats acceptés : ${Array.from(ALLOWED_UPLOAD_EXTENSIONS).join(', ')}`,
    })
  }
}
