import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import Papa from 'papaparse'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { eq } from 'drizzle-orm'
import { entities, entityFieldVersions, accounts } from '../schema'

// ============================================================
// Mapping région : label CSV → valeur enum FrenchRegion
// ============================================================
const REGION_LABEL_TO_ENUM: Record<string, string> = {
  'auvergne-rhône-alpes': 'AUVERGNE_RHONE_ALPES',
  'auvergne-rhone-alpes': 'AUVERGNE_RHONE_ALPES',
  'bourgogne-franche-comté': 'BOURGOGNE_FRANCHE_COMTE',
  'bourgogne-franche-comte': 'BOURGOGNE_FRANCHE_COMTE',
  'bretagne': 'BRETAGNE',
  'centre-val de loire': 'CENTRE_VAL_DE_LOIRE',
  'corse': 'CORSE',
  'grand est': 'GRAND_EST',
  'hauts-de-france': 'HAUTS_DE_FRANCE',
  'île-de-france': 'ILE_DE_FRANCE',
  'ile-de-france': 'ILE_DE_FRANCE',
  'normandie': 'NORMANDIE',
  'nouvelle-aquitaine': 'NOUVELLE_AQUITAINE',
  'occitanie': 'OCCITANIE',
  'pays de la loire': 'PAYS_DE_LA_LOIRE',
  "provence-alpes-côte d'azur": 'PROVENCE_ALPES_COTE_D_AZUR',
  "provence-alpes-cote d'azur": 'PROVENCE_ALPES_COTE_D_AZUR',
  'guadeloupe': 'GUADELOUPE',
  'guyane': 'GUYANE',
  'la réunion': 'LA_REUNION',
  'la reunion': 'LA_REUNION',
  'martinique': 'MARTINIQUE',
  'mayotte': 'MAYOTTE',
}

// ============================================================
// Fonctions de parsing
// ============================================================

function cleanSiret(raw: string): string {
  return raw.replace(/\s/g, '').trim()
}

function parseRegion(raw: string): string | null {
  if (!raw || raw.trim() === '' || raw.includes('#REF') || raw.includes('#ERROR')) return null
  return REGION_LABEL_TO_ENUM[raw.trim().toLowerCase()] ?? null
}

function parseAddress(raw: string): string | null {
  if (!raw || raw.trim() === '' || raw.includes('#REF') || raw.includes('#ERROR')) return null
  return raw.trim()
}

function parseNumber(raw: string): number | null {
  if (!raw || raw.trim() === '') return null
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

function parseRevenue(raw: string): number | null {
  if (!raw || raw.trim() === '') return null
  // "€ 94 100 000,00" → 94100000
  const cleaned = raw.replace(/€/g, '').replace(/\s/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : Math.round(value)
}

function parseRevenueYear(raw: string): number | null {
  if (!raw || raw.trim() === '') return null
  // "31/12/2023" → 2023 ou "2023" → 2023
  const dateMatch = raw.match(/\d{1,2}\/\d{1,2}\/(\d{4})/)
  if (dateMatch) return parseInt(dateMatch[1])
  const yearMatch = raw.match(/(\d{4})/)
  if (yearMatch) return parseInt(yearMatch[1])
  return null
}

function parseText(raw: string): string | null {
  if (!raw || raw.trim() === '' || raw.includes('#REF') || raw.includes('#ERROR')) return null
  return raw.trim()
}

function hasBio(certifications: string): boolean | null {
  if (!certifications || certifications.trim() === '') return null
  return certifications.toUpperCase().includes('BIO')
}

function extractQseLabels(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  const keywords = ['ISO', 'IFS', 'BRC', 'FSSC']
  const found = keywords.filter(kw => raw.toUpperCase().includes(kw))
  return found.length > 0 ? found.join(', ') : null
}

// ============================================================
// Script principal
// ============================================================

async function seedEntities() {
  const pool = new Pool({
    connectionString: process.env.NUXT_DATABASE_URL,
  })
  const db = drizzle(pool)

  console.log('🌱 Import des entreprises depuis CSV...\n')

  // 1. Lire et parser le CSV
  const csvPath = resolve(import.meta.dirname, 'entities.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')

  const { data: rows, errors } = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  })

  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} erreur(s) de parsing CSV :`)
    errors.slice(0, 5).forEach(e => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }

  console.log(`📋 ${rows.length} lignes lues depuis le CSV\n`)

  // 2. Récupérer le compte FEEF admin (pour createdBy)
  const [feefAdmin] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.role, 'FEEF'))
    .limit(1)

  if (!feefAdmin) {
    console.error('❌ Aucun compte FEEF trouvé. Lancez "npm run db:seed" d\'abord.')
    await pool.end()
    process.exit(1)
  }

  const createdBy = feefAdmin.id
  console.log(`👤 Compte FEEF : ${feefAdmin.email} (id: ${createdBy})\n`)

  // 3. Traiter chaque ligne
  let created = 0
  let updated = 0
  let skipped = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 : 1-indexé + ligne d'en-tête

    try {
      // --- Champs obligatoires ---
      const siret = cleanSiret(row['Siret'] ?? '')
      if (!siret || siret.length < 9) {
        console.warn(`  [L${rowNum}] ⚠️  SIRET invalide : "${row['Siret']}" → ignoré`)
        skipped++
        continue
      }

      const name = (row['Raison sociale'] ?? '').trim()
      if (!name) {
        console.warn(`  [L${rowNum}] ⚠️  Raison sociale vide → ignoré`)
        skipped++
        continue
      }

      // --- Champs directs (table entities) ---
      const crmId = (row['ID'] ?? '').trim() || null
      const region = parseRegion(row['Région'] ?? '')
      const address = parseAddress(row['billing_address_street'] ?? '')
      const postalCode = parseAddress(row['billing_address_postalcode'] ?? '')
      const city = parseAddress(row['billing_address_city'] ?? '')

      // --- Champs versionnés ---
      type VersionedField = {
        fieldKey: string
        valueString: string | null
        valueNumber: string | null
        valueBoolean: boolean | null
      }

      const versionedFields: VersionedField[] = []

      const effectif = parseNumber(row['Effectif'] ?? '')
      if (effectif !== null) {
        versionedFields.push({ fieldKey: 'employeesHeadcountHq', valueNumber: String(effectif), valueString: null, valueBoolean: null })
      }

      const sites = parseNumber(row['Nb de sites de production en France'] ?? '')
      if (sites !== null) {
        versionedFields.push({ fieldKey: 'sitesCount', valueNumber: String(sites), valueString: null, valueBoolean: null })
      }

      const ca = parseRevenue(row['CA'] ?? '')
      if (ca !== null) {
        versionedFields.push({ fieldKey: 'revenueAmount', valueNumber: String(ca), valueString: null, valueBoolean: null })
      }

      const revenueYear = parseRevenueYear(row['Année du CA'] ?? '')
      if (revenueYear !== null) {
        versionedFields.push({ fieldKey: 'revenueYear', valueNumber: String(revenueYear), valueString: null, valueBoolean: null })
      }

      const marque = parseText(row['Marque'] ?? '')
      if (marque) {
        versionedFields.push({ fieldKey: 'productsBrands', valueString: marque, valueNumber: null, valueBoolean: null })
      }

      const bioPresent = hasBio(row['Certifications'] ?? '')
      if (bioPresent !== null) {
        versionedFields.push({ fieldKey: 'bioLabelPresent', valueBoolean: bioPresent, valueString: null, valueNumber: null })
      }

      const qseLabels = extractQseLabels((row['Certfications*'] ?? '') || (row['Certifications'] ?? ''))
      if (qseLabels) {
        versionedFields.push({ fieldKey: 'qseLabelPresent', valueString: qseLabels, valueNumber: null, valueBoolean: null })
      }

      const nomenclature = parseText(row['Nomenclature produit'] ?? '')
      if (nomenclature) {
        versionedFields.push({ fieldKey: 'productsNature', valueString: nomenclature, valueNumber: null, valueBoolean: null })
      }

      const detailProduit = parseText(row['Détail produit'] ?? '')
      if (detailProduit) {
        versionedFields.push({ fieldKey: 'activitiesDescription', valueString: detailProduit, valueNumber: null, valueBoolean: null })
      }

      // --- Vérifier si l'entité existe déjà ---
      const [existing] = await db
        .select()
        .from(entities)
        .where(eq(entities.siret, siret))
        .limit(1)

      await db.transaction(async (tx) => {
        let entityId: number

        if (existing) {
          // Mise à jour
          await tx
            .update(entities)
            .set({
              name,
              ...(crmId !== null ? { crmId } : {}),
              ...(region !== null ? { region } : {}),
              ...(address !== null ? { address } : {}),
              ...(postalCode !== null ? { postalCode } : {}),
              ...(city !== null ? { city } : {}),
              updatedBy: createdBy,
              updatedAt: new Date(),
            })
            .where(eq(entities.id, existing.id))

          entityId = existing.id
          updated++
          console.log(`  [L${rowNum}] ✏️  MAJ : ${name}`)
        }
        else {
          // Création
          const [newEntity] = await tx
            .insert(entities)
            .values({
              name,
              siret,
              type: 'COMPANY',
              mode: 'MASTER',
              ...(crmId !== null ? { crmId } : {}),
              ...(region !== null ? { region } : {}),
              ...(address !== null ? { address } : {}),
              ...(postalCode !== null ? { postalCode } : {}),
              ...(city !== null ? { city } : {}),
              createdBy,
              updatedBy: createdBy,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning()

          entityId = newEntity.id
          created++
          console.log(`  [L${rowNum}] ✅ Créé : ${name}`)
        }

        // Insérer les champs versionnés
        for (const field of versionedFields) {
          await tx.insert(entityFieldVersions).values({
            entityId,
            fieldKey: field.fieldKey,
            valueString: field.valueString,
            valueNumber: field.valueNumber,
            valueBoolean: field.valueBoolean,
            valueDate: null,
            createdBy,
            createdAt: new Date(),
          })
        }
      })
    }
    catch (error) {
      console.error(`  [L${rowNum}] ❌ Erreur : ${error}`)
      errorCount++
    }
  }

  // 4. Résumé
  console.log('\n─────────────────────────────')
  console.log(`✅ Créées    : ${created}`)
  console.log(`✏️  Mises à jour : ${updated}`)
  console.log(`⏭️  Ignorées  : ${skipped}`)
  console.log(`❌ Erreurs   : ${errorCount}`)
  console.log(`📊 Total     : ${rows.length}`)
  console.log('─────────────────────────────')

  await pool.end()
  console.log('\n🏁 Import terminé')
}

seedEntities().catch((error) => {
  console.error(error)
  process.exit(1)
})
