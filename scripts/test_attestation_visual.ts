import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Mock data
const data = {
    entityName: 'ENTREPRISE TEST Nom longnng ',
    activity: 'Fabrication de produits gourmands et responsables sdhlfsd filsdkbfs fils fsf  sfilskbfsj fis fsf lsk fs f sfilsf  sf js flhs f sfis f sjd sf isbfshf s fh ',
    oeName: 'BUREAU VERITAS',
    globalScore: 85,
    labeledSince: '01/01/2023',
    expirationDate: '31/12/2024',
}

async function generate() {
    // Load template
    const templatePath = path.resolve(process.cwd(), 'app/assets/templates/TemplateAttestationDeLabellisation.pdf')

    if (!fs.existsSync(templatePath)) {
        console.error(`Template not found at: ${templatePath}`)
        return
    }

    const templateBuffer = fs.readFileSync(templatePath)
    const pdfDoc = await PDFDocument.load(templateBuffer)

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Get first page
    const pages = pdfDoc.getPages()
    const page = pages[0]
    const { width, height } = page.getSize()

    // Colors
    const darkBlue = rgb(0, 0.235, 0.475) // #003c79
    const white = rgb(1, 1, 1)

    // Helper to draw centered text
    const drawCenteredText = (text: string, y: number, size: number, color: any, fontToUse = font) => {
        const textWidth = fontToUse.widthOfTextAtSize(text, size)
        page.drawText(text, {
            x: (width - textWidth) / 2,
            y,
            size,
            font: fontToUse,
            color,
        })
    }

    // --- Overlay Data ---

    // Configuration de la zone de texte principale
    const startY = 500 // Hauteur de départ (remonté de 350 à 400)
    const marginX = 170 // Marge gauche (à ajuster)
    const rightMarginX = width - 53 // Marge droite pour la date (à ajuster)
    const lineHeight = 37 // Espace entre les lignes (augmenté pour taille 18)

    // Configuration pour le score global (à ajuster)
    const scoreX = 89 // Position X du score
    const scoreY = 219 // Position Y du score

    // Configuration pour la date d'expiration (à ajuster)
    const expirationX = 89 // Position X de la date d'expiration
    const expirationY = 177 // Position Y de la date d'expiration

    // Ligne 1 : "Décernée à l'entreprise : [Nom]" + "Labellisée depuis le [Date]"

    // Partie droite : Labellisée depuis... (calculer d'abord pour connaître l'espace disponible)
    const dateLabelText = `Labellisée depuis le ${data.labeledSince}`
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
        font: font, // Gras
        color: darkBlue,
    })

    // Calculer l'espace disponible pour le nom de l'entreprise
    const entityNameStartX = marginX + labelWidth
    const maxEntityNameWidth = dateBoxStartX - entityNameStartX - 20 // 20px de marge de sécurité

    // Tronquer le nom si nécessaire
    let displayEntityName = data.entityName
    let entityNameWidth = font.widthOfTextAtSize(displayEntityName, 18)

    if (entityNameWidth > maxEntityNameWidth) {
        // Tronquer avec "..."
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
        font: font, // Gras
        color: darkBlue,
    })

    // Dessiner le fond bleu pour la date
    page.drawRectangle({
        x: dateBoxStartX,
        y: startY - 2, // Ajustement vertical léger
        width: dateLabelWidth + (paddingX * 2),
        height: dateFontSize + (paddingY * 2),
        color: darkBlue,
    })

    // Dessiner le texte blanc par dessus
    page.drawText(dateLabelText, {
        x: rightMarginX - dateLabelWidth - paddingX,
        y: startY + paddingY, // Ajustement pour centrer verticalement dans le rectangle
        size: dateFontSize,
        font: font, // Gras
        color: white,
    })

    // Ligne 2 : "Pour son activité : [Activité]"
    const activityLabel = "Pour son activité : "
    const activityLabelWidth = font.widthOfTextAtSize(activityLabel, 18)

    page.drawText(activityLabel, {
        x: marginX,
        y: startY - lineHeight,
        size: 18,
        font: font, // Gras
        color: darkBlue,
    })

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
    const activityLines = wrapText(data.activity, maxActivityWidth, 18, fontRegular)

    // Dessiner chaque ligne de l'activité
    activityLines.forEach((line, index) => {
        page.drawText(line, {
            x: marginX + activityLabelWidth,
            y: startY - lineHeight - (index * 22), // 22 = espacement entre les lignes de texte
            size: 18,
            font: fontRegular, // Pas gras
            color: darkBlue,
        })
    })

    // --- Score global et date d'expiration (configurables) ---

    // Couleur de fond pour le score
    const lightGreen = rgb(0.808, 0.937, 0.890) // #ceefe3

    // Score global : "Niveau de performance obtenu sur les exigences du label : XX %"
    const scoreFullText = `Niveau de performance obtenu sur les exigences du label : ${data.globalScore} %`

    // Calculer les dimensions pour le fond
    const scoreFullWidth = font.widthOfTextAtSize(scoreFullText, 16)
    const scorePaddingX = 10
    const scorePaddingY = 5

    // Dessiner le fond vert (ajusté pour centrer le texte)
    const textHeight = 16 // Taille de la police
    const rectHeight = textHeight + (scorePaddingY * 2)

    page.drawRectangle({
        x: scoreX - scorePaddingX,
        y: scoreY - scorePaddingY - 3, // -3 pour compenser la baseline du texte
        width: scoreFullWidth + (scorePaddingX * 2),
        height: rectHeight,
        color: lightGreen,
    })

    // Dessiner le texte complet en gras
    page.drawText(scoreFullText, {
        x: scoreX,
        y: scoreY,
        size: 16,
        font: font, // Gras
        color: darkBlue,
    })

    // Date d'expiration : "Durée de validité d'un an à compter du xx/xx/xxxx"
    const validityText = `Durée de validité d'un an à compter du ${data.expirationDate}`

    page.drawText(validityText, {
        x: expirationX,
        y: expirationY,
        size: 16,
        font: font, // Gras
        color: darkBlue,
    })

    // Save PDF
    const pdfBytes = await pdfDoc.save()
    const outputPath = path.resolve(process.cwd(), 'test-attestation.pdf')
    fs.writeFileSync(outputPath, pdfBytes)
    console.log(`PDF generated at: ${outputPath}`)
}

generate().catch(console.error)
