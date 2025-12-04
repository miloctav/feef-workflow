import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { DocumentGenerator } from './DocumentGenerator'
import type { DocumentGenerationContext, DocumentGenerationResult } from './types'

/**
 * Générateur d'attestations de labellisation
 *
 * Utilise pdf-lib pour remplir un template PDF existant
 */
export class AttestationGenerator extends DocumentGenerator {
  /**
   * Récupère l'audit, l'entité, et l'OE
   */
  protected async fetchData(context: DocumentGenerationContext): Promise<Record<string, any>> {
    const { auditId } = context.data

    if (!auditId) {
      throw new Error('[AttestationGenerator] auditId est requis')
    }

    // Récupérer l'audit avec toutes ses relations
    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, auditId),
      with: {
        entity: {
          with: {
            fieldVersions: true,
          },
        },
        oe: true,
      },
    })

    if (!audit) {
      throw new Error(`[AttestationGenerator] Audit ${auditId} non trouvé`)
    }

    return { audit, entity: audit.entity, oe: audit.oe }
  }

  /**
   * Valide que toutes les données nécessaires sont présentes
   */
  protected validateData(data: Record<string, any>): void {
    const { audit, entity } = data

    if (!entity) {
      throw new Error('[AttestationGenerator] Entité non trouvée pour cet audit')
    }

    if (!audit.globalScore) {
      throw new Error('[AttestationGenerator] Score global requis pour générer l\'attestation')
    }

    if (!audit.labelExpirationDate) {
      throw new Error('[AttestationGenerator] Date d\'expiration du label requise')
    }

    // OE optionnel (peut être null pour certains audits)
  }

  /**
   * Récupère la dernière version d'un champ de l'entité
   */
  private getLatestFieldValue(entity: any, fieldKey: string): any {
    if (!entity.fieldVersions || entity.fieldVersions.length === 0) {
      return null
    }

    // Filtrer les versions pour ce champ et trier par date de création décroissante
    const fieldVersions = entity.fieldVersions
      .filter((v: any) => v.fieldKey === fieldKey)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (fieldVersions.length === 0) {
      return null
    }

    return fieldVersions[0].value
  }

  /**
   * Génère le PDF de l'attestation en remplissant le template
   */
  protected async generatePdf(data: Record<string, any>): Promise<DocumentGenerationResult> {
    const { audit, entity, oe } = data

    // Charger le template PDF
    const templatePath = path.resolve(process.cwd(), 'app/assets/templates/TemplateAttestationDeLabellisation.pdf')

    if (!fs.existsSync(templatePath)) {
      throw new Error(`[AttestationGenerator] Template non trouvé: ${templatePath}`)
    }

    const templateBuffer = fs.readFileSync(templatePath)
    const pdfDoc = await PDFDocument.load(templateBuffer)

    // Embarquer la police
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Récupérer la première page
    const pages = pdfDoc.getPages()
    const page = pages[0]
    const { width, height } = page.getSize()

    // Définir les couleurs
    const darkBlue = rgb(0, 0.235, 0.475) // #003c79
    const white = rgb(1, 1, 1)
    const lightGreen = rgb(0.808, 0.937, 0.890) // #ceefe3

    // --- Configuration des positions (à ajuster selon le template) ---
    const startY = 500
    const marginX = 170
    const rightMarginX = width - 53
    const lineHeight = 37

    const scoreX = 89
    const scoreY = 219

    const expirationX = 89
    const expirationY = 177

    // --- Ligne 1 : "Décernée à l'entreprise : [Nom]" + "Labellisée depuis le [Date]" ---

    // Partie droite : Labellisée depuis... (calculer d'abord pour connaître l'espace disponible)
    const labeledSince = this.formatDate(audit.actualEndDate || audit.feefDecisionAt)
    const dateLabelText = `Labellisée depuis le ${labeledSince}`
    const dateFontSize = 12
    const dateLabelWidth = font.widthOfTextAtSize(dateLabelText, dateFontSize)
    const paddingX = 10
    const paddingY = 5
    const dateBoxStartX = rightMarginX - dateLabelWidth - (paddingX * 2)

    // Partie gauche : Décernée à...
    const labelText = "Décernée à l'entreprise : "
    const labelWidth = font.widthOfTextAtSize(labelText, 18)

    page.drawText(labelText, {
      x: marginX,
      y: startY,
      size: 18,
      font: font,
      color: darkBlue,
    })

    // Calculer l'espace disponible pour le nom de l'entreprise
    const entityNameStartX = marginX + labelWidth
    const maxEntityNameWidth = dateBoxStartX - entityNameStartX - 20

    // Tronquer le nom si nécessaire
    let displayEntityName = entity.name || ''
    let entityNameWidth = font.widthOfTextAtSize(displayEntityName, 18)

    if (entityNameWidth > maxEntityNameWidth) {
      while (entityNameWidth > maxEntityNameWidth && displayEntityName.length > 0) {
        displayEntityName = displayEntityName.slice(0, -1)
        entityNameWidth = font.widthOfTextAtSize(displayEntityName + '...', 18)
      }
      displayEntityName += '...'
    }

    page.drawText(displayEntityName, {
      x: entityNameStartX,
      y: startY,
      size: 18,
      font: font,
      color: darkBlue,
    })

    // Dessiner le fond bleu pour la date
    page.drawRectangle({
      x: dateBoxStartX,
      y: startY - 2,
      width: dateLabelWidth + (paddingX * 2),
      height: dateFontSize + (paddingY * 2),
      color: darkBlue,
    })

    // Dessiner le texte blanc par dessus
    page.drawText(dateLabelText, {
      x: rightMarginX - dateLabelWidth - paddingX,
      y: startY + paddingY,
      size: dateFontSize,
      font: font,
      color: white,
    })

    // --- Ligne 2 : "Pour son activité : [Activité]" ---
    const activityLabel = "Pour son activité : "
    const activityLabelWidth = font.widthOfTextAtSize(activityLabel, 18)

    page.drawText(activityLabel, {
      x: marginX,
      y: startY - lineHeight,
      size: 18,
      font: font,
      color: darkBlue,
    })

    // Récupérer la dernière version du champ labelingScopeRequestedScope
    const activity = this.getLatestFieldValue(entity, 'labelingScopeRequestedScope') || entity.activity || entity.description || ''

    // Fonction pour découper le texte en lignes selon la largeur max
    const wrapText = (text: string, maxWidth: number, fontSize: number, fontToUse: any): string[] => {
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = fontToUse.widthOfTextAtSize(testLine, fontSize)

        if (testWidth <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) {
            lines.push(currentLine)
          }
          currentLine = word
        }
      }

      if (currentLine) {
        lines.push(currentLine)
      }

      return lines
    }

    // Calculer la largeur maximale pour l'activité
    const maxActivityWidth = rightMarginX - (marginX + activityLabelWidth)
    const activityLines = wrapText(activity, maxActivityWidth, 18, fontRegular)

    // Dessiner chaque ligne de l'activité
    activityLines.forEach((line, index) => {
      page.drawText(line, {
        x: marginX + activityLabelWidth,
        y: startY - lineHeight - (index * 22),
        size: 18,
        font: fontRegular,
        color: darkBlue,
      })
    })

    // --- Score global avec fond vert ---
    const scoreFullText = `Niveau de performance obtenu sur les exigences du label : ${audit.globalScore || 0} %`
    const scoreFullWidth = font.widthOfTextAtSize(scoreFullText, 16)
    const scorePaddingX = 10
    const scorePaddingY = 5

    // Dessiner le fond vert (ajusté pour centrer le texte)
    const textHeight = 16
    const rectHeight = textHeight + (scorePaddingY * 2)

    page.drawRectangle({
      x: scoreX - scorePaddingX,
      y: scoreY - scorePaddingY - 3,
      width: scoreFullWidth + (scorePaddingX * 2),
      height: rectHeight,
      color: lightGreen,
    })

    // Dessiner le texte complet en gras
    page.drawText(scoreFullText, {
      x: scoreX,
      y: scoreY,
      size: 16,
      font: font,
      color: darkBlue,
    })

    // --- Date d'expiration ---
    const expirationDate = this.formatDate(audit.labelExpirationDate)
    const validityText = `Durée de validité d'un an à compter du ${expirationDate}`

    page.drawText(validityText, {
      x: expirationX,
      y: expirationY,
      size: 16,
      font: font,
      color: darkBlue,
    })

    // Sauvegarder le PDF modifié
    const pdfBytes = await pdfDoc.save()
    const pdfBuffer = Buffer.from(pdfBytes)

    const filename = `attestation-${entity.name?.replace(/\s+/g, '-')}-${Date.now()}.pdf`

    return {
      buffer: pdfBuffer,
      filename,
      mimeType: 'application/pdf',
    }
  }

  /**
   * Formate une date en français (JJ/MM/AAAA)
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return 'N/A'

    const d = typeof date === 'string' ? new Date(date) : date
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()

    return `${day}/${month}/${year}`
  }
}
