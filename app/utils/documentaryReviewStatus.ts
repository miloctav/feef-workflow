import type { DocumentaryReview, DocumentaryReviewVersion } from '~~/app/types/documentaryReviews'

export const DocumentaryReviewStatus = {
  UPLOADED: 'UPLOADED',
  PENDING_REQUEST: 'PENDING_REQUEST',
  MISSING: 'MISSING',
} as const

export type DocumentaryReviewStatusType =
  (typeof DocumentaryReviewStatus)[keyof typeof DocumentaryReviewStatus]

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const DocumentaryReviewStatusMeta: Record<
  DocumentaryReviewStatusType,
  { label: string; color: BadgeColor; icon: string }
> = {
  UPLOADED: { label: 'Déposé', color: 'success', icon: 'i-lucide-check-circle-2' },
  PENDING_REQUEST: { label: 'Mise à jour demandée', color: 'warning', icon: 'i-lucide-alert-circle' },
  MISSING: { label: 'En attente de dépôt', color: 'neutral', icon: 'i-lucide-circle-dashed' },
}

/** Une version « fantôme » matérialise une demande de dépôt : pas de fichier, mais un demandeur. */
export function isPendingRequestVersion(version: DocumentaryReviewVersion): boolean {
  return version.s3Key === null && version.askedBy !== null
}

/** Les versions réellement déposées, de la plus récente à la plus ancienne. */
export function getUploadedVersions(document: DocumentaryReview): DocumentaryReviewVersion[] {
  return (document.documentVersions ?? [])
    .filter((version) => version.s3Key !== null)
    .sort((a, b) => new Date(b.uploadAt).getTime() - new Date(a.uploadAt).getTime())
}

export function getPendingRequest(document: DocumentaryReview): DocumentaryReviewVersion | undefined {
  return (document.documentVersions ?? []).find(isPendingRequestVersion)
}

export function getDocumentaryReviewStatus(document: DocumentaryReview): DocumentaryReviewStatusType {
  if (getPendingRequest(document)) return DocumentaryReviewStatus.PENDING_REQUEST
  if (getUploadedVersions(document).length > 0) return DocumentaryReviewStatus.UPLOADED
  return DocumentaryReviewStatus.MISSING
}

export function formatAccountName(
  account?: { firstname: string | null; lastname: string | null } | null
): string {
  if (!account) return ''
  return [account.firstname, account.lastname].filter(Boolean).join(' ')
}
