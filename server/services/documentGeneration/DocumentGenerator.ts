import type { Buffer } from 'node:buffer'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { documentVersions } from '~~/server/database/schema'
import { uploadFile } from '~~/server/services/garage'
import { forInsert } from '~~/server/utils/tracking'
import type {
  DocumentGenerationContext,
  DocumentGenerationResult,
  SaveDocumentOptions,
} from './types'

/**
 * Classe abstraite de base pour la génération de documents
 *
 * Pattern Template : définit le squelette de l'algorithme de génération,
 * les sous-classes implémentent les étapes spécifiques.
 *
 * Workflow :
 * 1. fetchData() - Récupérer les données nécessaires
 * 2. validateData() - Valider que les données sont complètes
 * 3. generatePdf() - Générer le PDF (Puppeteer, pdf-lib, etc.)
 * 4. saveToDatabase() - Sauvegarder dans document_versions + Garage
 */
export abstract class DocumentGenerator {
  /**
   * Méthode principale : génère et sauvegarde le document
   *
   * @param context - Contexte de génération (event, data initiale)
   * @param saveOptions - Options de sauvegarde (auditId, entityId, etc.)
   * @returns ID de la version de document créée
   */
  async generate(
    context: DocumentGenerationContext,
    saveOptions: SaveDocumentOptions
  ): Promise<number> {
    console.log(`[${this.constructor.name}] Début de la génération de document`)

    try {
      // 1. Récupérer les données complètes
      const data = await this.fetchData(context)
      console.log(`[${this.constructor.name}] Données récupérées`)

      // 2. Valider les données
      this.validateData(data)
      console.log(`[${this.constructor.name}] Données validées`)

      // 3. Générer le PDF
      const result = await this.generatePdf(data)
      console.log(`[${this.constructor.name}] PDF généré (${result.buffer.length} bytes)`)

      // 4. Sauvegarder dans la base de données et Garage
      const versionId = await this.saveToDatabase(result, context.event, saveOptions)
      console.log(`[${this.constructor.name}] Document sauvegardé (version ID: ${versionId})`)

      return versionId
    } catch (error) {
      console.error(`[${this.constructor.name}] Erreur lors de la génération:`, error)
      throw error
    }
  }

  /**
   * Récupère les données nécessaires à la génération
   * À implémenter par les sous-classes
   */
  protected abstract fetchData(context: DocumentGenerationContext): Promise<Record<string, any>>

  /**
   * Valide que les données sont complètes et correctes
   * À implémenter par les sous-classes
   */
  protected abstract validateData(data: Record<string, any>): void

  /**
   * Génère le PDF à partir des données
   * À implémenter par les sous-classes
   */
  protected abstract generatePdf(data: Record<string, any>): Promise<DocumentGenerationResult>

  /**
   * Sauvegarde le document généré dans la base de données et Garage
   * Méthode commune à tous les générateurs
   */
  protected async saveToDatabase(
    result: DocumentGenerationResult,
    event: H3Event,
    options: SaveDocumentOptions
  ): Promise<number> {
    const userId = event.context.userId

    // 1. Créer l'enregistrement document_version
    const [version] = await db
      .insert(documentVersions)
      .values(forInsert(event, {
        auditId: options.auditId,
        auditDocumentType: options.auditDocumentType as any,
        documentaryReviewId: options.documentaryReviewId,
        contractId: options.contractId,
        mimeType: result.mimeType,
        uploadBy: userId,
        s3Key: null, // Sera mis à jour après l'upload Garage
      }))
      .returning()

    console.log(`[DocumentGenerator] Version créée (ID: ${version.id})`)

    try {
      // 2. Uploader vers Garage
      const documentType = options.auditId ? 'audit' : options.contractId ? 'contract' : 'documentary-review'
      const documentId = options.auditId || options.contractId || options.documentaryReviewId!

      const s3Key = await uploadFile(
        result.buffer,
        result.filename,
        result.mimeType,
        options.entityId,
        documentId,
        version.id,
        documentType,
        options.auditDocumentType
      )

      console.log(`[DocumentGenerator] Fichier uploadé vers Garage (s3Key: ${s3Key})`)

      // 3. Mettre à jour la version avec la clé S3
      await db
        .update(documentVersions)
        .set({ s3Key })
        .where(eq(documentVersions.id, version.id))

      return version.id
    } catch (error) {
      // Rollback : supprimer la version si l'upload échoue
      console.error(`[DocumentGenerator] Erreur lors de l'upload Garage, suppression de la version ${version.id}`)
      await db.delete(documentVersions).where(eq(documentVersions.id, version.id))
      throw error
    }
  }
}
