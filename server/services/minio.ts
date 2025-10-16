import * as Minio from 'minio'

// Configuration MinIO depuis les variables d'environnement
const config = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
}

const bucketName = process.env.MINIO_BUCKET || 'feef-storage'

// Singleton du client MinIO
let minioClient: Minio.Client | null = null

/**
 * Obtenir ou créer le client MinIO
 */
export function getMinioClient(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client(config)
  }
  return minioClient
}

/**
 * Initialiser le bucket MinIO (créer s'il n'existe pas)
 */
export async function initializeBucket(): Promise<void> {
  const client = getMinioClient()

  try {
    const exists = await client.bucketExists(bucketName)

    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1')
      console.log(`✅ Bucket MinIO créé: ${bucketName}`)
    } else {
      console.log(`✅ Bucket MinIO existe déjà: ${bucketName}`)
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du bucket MinIO:', error)
    throw error
  }
}

/**
 * Uploader un fichier vers MinIO
 * @param buffer - Buffer du fichier
 * @param filename - Nom du fichier original
 * @param entityId - ID de l'entité
 * @param documentaryReviewId - ID du documentary review
 * @param versionId - ID de la version
 * @returns Clé (path) du fichier dans MinIO
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  entityId: number,
  documentaryReviewId: number,
  versionId: number
): Promise<string> {
  const client = getMinioClient()

  // Générer la clé avec la structure: documents/{entityId}/{documentaryReviewId}/{versionId}-{filename}
  const key = `documents/${entityId}/${documentaryReviewId}/${versionId}-${filename}`

  try {
    await client.putObject(bucketName, key, buffer, buffer.length)
    console.log(`✅ Fichier uploadé: ${key}`)
    return key
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload du fichier:', error)
    throw error
  }
}

/**
 * Générer une URL signée pour accéder à un fichier (valide 1 heure)
 * @param key - Clé du fichier dans MinIO
 * @returns URL signée
 */
export async function getSignedUrl(key: string): Promise<string> {
  const client = getMinioClient()

  try {
    // URL valide pendant 1 heure (3600 secondes)
    const url = await client.presignedGetObject(bucketName, key, 3600)
    return url
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'URL signée:', error)
    throw error
  }
}

/**
 * Supprimer un fichier de MinIO
 * @param key - Clé du fichier dans MinIO
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getMinioClient()

  try {
    await client.removeObject(bucketName, key)
    console.log(`✅ Fichier supprimé: ${key}`)
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du fichier:', error)
    throw error
  }
}
