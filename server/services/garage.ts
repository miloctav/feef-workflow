import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'

// Configuration Garage depuis les variables d'environnement
const config = {
  endpoint: process.env.GARAGE_ENDPOINT || 'http://54.38.183.70:3900',
  region: process.env.GARAGE_REGION || 'garage',
  credentials: {
    accessKeyId: process.env.GARAGE_ACCESS_KEY || '',
    secretAccessKey: process.env.GARAGE_SECRET_KEY || '',
  },
  forcePathStyle: true, // Important pour Garage
}

const bucketName = process.env.GARAGE_BUCKET || 'feef-storage'

// Singleton du client S3
let s3Client: S3Client | null = null

/**
 * Obtenir ou créer le client S3 (Garage)
 */
export function getGarageClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(config)
  }
  return s3Client
}

/**
 * Initialiser le bucket Garage (créer s'il n'existe pas)
 * Note: Le bucket doit normalement être créé manuellement via Garage CLI
 * Cette fonction sert de fallback pour le développement local
 */
export async function initializeBucket(): Promise<void> {
  const client = getGarageClient()

  try {
    // Vérifier si le bucket existe
    await client.send(new HeadBucketCommand({ Bucket: bucketName }))
    console.log(`✅ Bucket Garage existe déjà: ${bucketName}`)
  } catch (error: any) {
    // Si le bucket n'existe pas (erreur 404), on le crée
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        await client.send(
          new CreateBucketCommand({
            Bucket: bucketName,
          })
        )
        console.log(`✅ Bucket Garage créé: ${bucketName}`)
      } catch (createError) {
        console.error('❌ Erreur lors de la création du bucket Garage:', createError)
        throw createError
      }
    } else {
      console.error('❌ Erreur lors de la vérification du bucket Garage:', error)
      throw error
    }
  }
}

/**
 * Uploader un fichier vers Garage
 * @param buffer - Buffer du fichier
 * @param filename - Nom du fichier original
 * @param mimeType - Type MIME du fichier
 * @param entityId - ID de l'entité
 * @param documentaryReviewId - ID du documentary review
 * @param versionId - ID de la version
 * @returns Clé (path) du fichier dans Garage
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  entityId: number,
  documentaryReviewId: number,
  versionId: number
): Promise<string> {
  const client = getGarageClient()

  // Générer la clé avec la structure: documents/{entityId}/{documentaryReviewId}/{versionId}-{filename}
  const key = `documents/${entityId}/${documentaryReviewId}/${versionId}-${filename}`

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      })
    )
    console.log(`✅ Fichier uploadé: ${key} (${mimeType})`)
    return key
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload du fichier:', error)
    throw error
  }
}

/**
 * Générer une URL signée pour accéder à un fichier (valide 1 heure)
 * @param key - Clé du fichier dans Garage
 * @returns URL signée
 */
export async function getSignedUrl(key: string): Promise<string> {
  const client = getGarageClient()

  try {
    // Créer la commande GetObject
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: 'inline', // Forcer l'affichage dans le navigateur
    })

    // Générer l'URL signée valide pendant 1 heure (3600 secondes)
    const url = await getS3SignedUrl(client, command, { expiresIn: 3600 })
    return url
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'URL signée:', error)
    throw error
  }
}

/**
 * Supprimer un fichier de Garage
 * @param key - Clé du fichier dans Garage
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getGarageClient()

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    console.log(`✅ Fichier supprimé: ${key}`)
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du fichier:', error)
    throw error
  }
}
