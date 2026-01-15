// Constantes MIME types prévisualisables
export const PREVIEWABLE_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/bmp',
]

export const PREVIEWABLE_TEXT_TYPES = ['text/plain', 'text/csv']

export const OFFICE_MIME_TYPES = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
]

// Fonctions helper pour détection de types
export function isPreviewableImage(mimeType: string): boolean {
    return PREVIEWABLE_IMAGE_TYPES.includes(mimeType)
}

export function isPreviewableText(mimeType: string): boolean {
    return PREVIEWABLE_TEXT_TYPES.includes(mimeType)
}

export function isOfficeMimeType(mimeType: string): boolean {
    return OFFICE_MIME_TYPES.includes(mimeType)
}

// Fonction pour obtenir l'icône selon le type MIME
export function getFileTypeIcon(mimeType: string | null | undefined): string {
    if (!mimeType) return 'i-lucide-file'

    // PDF
    if (mimeType === 'application/pdf') return 'i-lucide-file-text'

    // Images
    if (mimeType.startsWith('image/')) return 'i-lucide-image'

    // Texte
    if (mimeType === 'text/plain') return 'i-lucide-file-text'
    if (mimeType === 'text/csv') return 'i-lucide-table'

    // Office documents
    if (mimeType.includes('word')) return 'i-lucide-file-text'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'i-lucide-table'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
        return 'i-lucide-presentation'

    // Archives
    if (
        mimeType === 'application/zip' ||
        mimeType.includes('compressed') ||
        mimeType.includes('tar') ||
        mimeType.includes('rar')
    )
        return 'i-lucide-file-archive'

    // JSON/XML
    if (mimeType === 'application/json' || mimeType === 'application/xml') return 'i-lucide-braces'

    // HTML/CSS/JS
    if (mimeType === 'text/html') return 'i-lucide-code'
    if (mimeType === 'text/css' || mimeType === 'text/javascript') return 'i-lucide-file-code'

    // Fallback
    return 'i-lucide-file'
}

// Fonction pour obtenir le label selon le type MIME
export function getFileTypeLabel(mimeType: string | null | undefined): string {
    if (!mimeType) return 'Fichier'

    const labels: Record<string, string> = {
        'application/pdf': 'PDF',
        'image/jpeg': 'Image JPEG',
        'image/png': 'Image PNG',
        'image/gif': 'Image GIF',
        'image/svg+xml': 'Image SVG',
        'image/webp': 'Image WebP',
        'image/bmp': 'Image BMP',
        'text/plain': 'Fichier texte',
        'text/csv': 'Fichier CSV',
        'application/msword': 'Document Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Document Word',
        'application/vnd.ms-excel': 'Fichier Excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Fichier Excel',
        'application/vnd.ms-powerpoint': 'Présentation PowerPoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            'Présentation PowerPoint',
        'application/vnd.oasis.opendocument.text': 'Document OpenDocument',
        'application/vnd.oasis.opendocument.spreadsheet': 'Feuille de calcul OpenDocument',
        'application/vnd.oasis.opendocument.presentation': 'Présentation OpenDocument',
        'application/zip': 'Archive ZIP',
        'application/x-rar-compressed': 'Archive RAR',
        'application/x-7z-compressed': 'Archive 7Z',
        'application/json': 'Fichier JSON',
        'application/xml': 'Fichier XML',
        'text/html': 'Fichier HTML',
    }

    return labels[mimeType] || 'Fichier'
}
