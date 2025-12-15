// Type pour les informations de l'uploader
export interface UploadByAccount {
  id: number
  firstname: string
  lastname: string
}

// Type pour une version de document (avec relations)
export interface DocumentVersion {
  id: number
  documentaryReviewId: number
  uploadAt: string
  s3Key: string | null
  mimeType: string | null
  uploadBy: number
  uploadByAccount: UploadByAccount
  askedBy: number | null
  askedAt: string | null
  askedByAccount: UploadByAccount | null
  comment: string | null
  auditDocumentType?: string | null
}

// Type pour créer une nouvelle version de document
export interface CreateDocumentVersionData {
  documentaryReviewId: number
}
