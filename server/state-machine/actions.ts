/**
 * Actions (Side-effects) pour la State Machine des audits
 *
 * Les actions sont des fonctions qui exécutent des effets de bord
 * lors des transitions de statuts (génération de documents, mise à jour
 * de champs, calculs, etc.)
 */

import { db } from '~~/server/database'
import { audits, entities } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { forUpdate } from '~~/server/utils/tracking'
import type { Audit } from '~~/server/database/schema'
import type { H3Event } from 'h3'

/**
 * Vérifie si un plan correctif est nécessaire et met à jour needsCorrectivePlan
 *
 * Cette action appelle updateNeedsCorrectivePlan() qui recalcule le flag
 * basé sur le score global et les notations individuelles.
 *
 * Logique : needsCorrectivePlan = true si score < 65 OU notation C/D détectée
 */
export async function checkIfCorrectivePlanNeeded(audit: Audit, event: H3Event): Promise<void> {
  const { user } = await requireUserSession(event)
  const { updateNeedsCorrectivePlan } = await import('~~/server/utils/auditCorrectivePlan')

  console.log(`[State Machine Action] Vérification si plan correctif nécessaire pour audit ${audit.id}`)

  await updateNeedsCorrectivePlan(audit.id, user.id)

  console.log(`[State Machine Action] ✅ Plan correctif vérifié pour audit ${audit.id}`)
}

/**
 * Calcule la date d'expiration du label (aujourd'hui + 1 an)
 *
 * Cette action est exécutée lors de la transition vers COMPLETED.
 * Elle calcule labelExpirationDate = date actuelle + 365 jours.
 */
export async function calculateLabelExpiration(audit: Audit, event: H3Event): Promise<void> {
  const expirationDate = new Date()
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)
  const labelExpirationDate = expirationDate.toISOString().split('T')[0] // Format YYYY-MM-DD

  console.log(`[State Machine Action] Calcul de la date d'expiration du label pour audit ${audit.id}`)
  console.log(`[State Machine Action] Date d'expiration : ${labelExpirationDate}`)

  await db.update(audits)
    .set(forUpdate(event, { labelExpirationDate }))
    .where(eq(audits.id, audit.id))

  console.log(`[State Machine Action] ✅ Date d'expiration mise à jour pour audit ${audit.id}`)
}

/**
 * Réinitialise les champs de workflow de l'entité pour le prochain cycle
 *
 * Cette action est exécutée lors de la transition vers COMPLETED.
 * Elle réinitialise les champs de workflow de l'entité pour préparer
 * le prochain cycle d'audit (renouvellement).
 *
 * Champs réinitialisés :
 * - documentaryReviewReadyAt
 * - documentaryReviewReadyBy
 */
export async function resetEntityWorkflow(audit: Audit, event: H3Event): Promise<void> {
  console.log(`[State Machine Action] Réinitialisation des champs de workflow pour l'entité ${audit.entityId}`)

  await db.update(entities)
    .set(forUpdate(event, {
      documentaryReviewReadyAt: null,
      documentaryReviewReadyBy: null,
    }))
    .where(eq(entities.id, audit.entityId))

  console.log(`[State Machine Action] ✅ Champs de workflow réinitialisés pour l'entité ${audit.entityId}`)
}

/**
 * Génère l'attestation de labellisation
 *
 * Cette action est exécutée lors de l'entrée dans l'état COMPLETED.
 * Elle génère le document d'attestation de labellisation et le stocke
 * dans Garage (S3).
 *
 * Note: Cette action est non-bloquante - si la génération échoue,
 * la transition vers COMPLETED réussit quand même.
 */
export async function generateAttestation(audit: Audit, event: H3Event): Promise<void> {
  console.log(`[State Machine Action] 🔄 Génération de l'attestation pour l'audit #${audit.id}`)

  try {
    // Vérifier les prérequis
    if (!audit.globalScore) {
      console.error(`[State Machine Action] ❌ globalScore manquant pour l'audit #${audit.id}`)
      return
    }
    if (!audit.labelExpirationDate) {
      console.error(`[State Machine Action] ❌ labelExpirationDate manquant pour l'audit #${audit.id}`)
      return
    }

    const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')
    const generator = new AttestationGenerator()

    console.log(`[State Machine Action] ⏳ Appel à AttestationGenerator.generate() pour l'audit #${audit.id}`)

    await generator.generate(
      { event, data: { auditId: audit.id } },
      {
        auditId: audit.id,
        auditDocumentType: 'ATTESTATION',
        entityId: audit.entityId,
      }
    )

    console.log(`[State Machine Action] ✅ Attestation générée avec succès pour l'audit #${audit.id}`)
  } catch (error) {
    console.error(`[State Machine Action] ❌ Erreur lors de la génération de l'attestation pour l'audit #${audit.id}`)
    console.error('[State Machine Action] Stack trace:', error)
    // Non-blocking: ne pas empêcher la transition de réussir
    // L'attestation peut être régénérée manuellement si nécessaire
  }
}

/**
 * Crée un nouvel audit en cas de refus par l'OE
 *
 * Cette action est exécutée lorsque l'OE refuse un audit.
 * Elle effectue les opérations suivantes :
 * 1. Retire l'OE de l'entité (oeId = null)
 * 2. Crée un nouvel audit du même type au statut PENDING_OE_CHOICE
 * 3. Lie le nouvel audit à l'ancien via previousAuditId
 * 4. Crée les actions pour le nouveau statut
 */
export async function createNewAuditAfterRefusal(audit: Audit, event: H3Event): Promise<void> {
  const { user } = await requireUserSession(event)

  console.log(`[State Machine Action] Création d'un nouvel audit après refus de l'audit ${audit.id}`)

  // 1. Retirer l'OE de l'entité
  await db.update(entities)
    .set(forUpdate(event, {
      oeId: null,
    }))
    .where(eq(entities.id, audit.entityId))

  console.log(`[State Machine Action] OE retiré de l'entité ${audit.entityId}`)

  // 2. Créer un nouvel audit avec les informations de l'audit refusé
  const [newAudit] = await db.insert(audits)
    .values({
      entityId: audit.entityId,
      type: audit.type, // Même type que l'audit refusé
      status: 'PENDING_OE_CHOICE', // Pas d'OE assigné
      previousAuditId: audit.id, // Lien vers l'audit refusé
      createdBy: user.id,
      createdAt: new Date(),
    })
    .returning()

  console.log(`[State Machine Action] Nouvel audit créé : ${newAudit.id} (type: ${newAudit.type}, statut: ${newAudit.status})`)

  // 3. Créer les actions pour le nouveau statut
  const { createActionsForAuditStatus } = await import('~~/server/services/actions')
  await createActionsForAuditStatus(newAudit, newAudit.status, event)

  console.log(`[State Machine Action] ✅ Actions créées pour le nouvel audit ${newAudit.id}`)
}
