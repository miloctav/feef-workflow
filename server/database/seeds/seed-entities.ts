import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { eq } from 'drizzle-orm'
import { entities, accounts, entityFieldVersions } from '../schema'

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
// Fonctions utilitaires
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

function fakeSiret(crmId: string): string {
  // FAKE_ + 9 premiers chars du CRM ID = 14 chars max
  return 'FAKE_' + crmId.replace(/-/g, '').slice(0, 9)
}

// ============================================================
// Rapport
// ============================================================

type ReportLine = {
  passe: string
  ligne: number | string
  siret: string
  nom: string
  probleme: string
  details: string
}

function writeReport(lines: ReportLine[], dirPath: string) {
  if (lines.length === 0) {
    console.log('✅ Aucune anomalie à reporter.')
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const reportPath = resolve(dirPath, `rapport-entities-${date}.csv`)

  const csv = Papa.unparse(lines, { delimiter: ';' })
  writeFileSync(reportPath, '\uFEFF' + csv, 'utf-8') // BOM pour Excel
  console.log(`\n📄 Rapport écrit : ${reportPath}`)
  console.log(`   ${lines.length} anomalie(s) détectée(s)`)
}

// ============================================================
// Types CSV
// ============================================================

type EntityRow = Record<string, string>
type MereFilleRow = {
  id_fille: string
  siret_fille: string
  id_mere: string
  name_mere: string
  siret_mere: string
  is_mother_master: string
}

// ============================================================
// Script principal
// ============================================================

async function seedEntities() {
  const pool = new Pool({
    connectionString: process.env.NUXT_DATABASE_URL,
  })
  const db = drizzle(pool)

  console.log('🌱 Import des entreprises...\n')

  // Récupérer le compte FEEF admin (pour createdBy)
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
  const ECOCERT_OE_ID = 1
  console.log(`👤 Compte FEEF : ${feefAdmin.email}`)
  console.log(`🏢 OE Ecocert ID : ${ECOCERT_OE_ID}\n`)

  const report: ReportLine[] = []

  // ──────────────────────────────────────────────────────────
  // PASSE 1 — Créer/MAJ les entreprises depuis entities.csv
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 1 : import des entreprises...\n')

  const entitiesCsvPath = resolve(import.meta.dirname, 'entities.csv')
  const entitiesCsvContent = readFileSync(entitiesCsvPath, 'utf-8')

  const { data: entityRows, errors: entityErrors } = Papa.parse<EntityRow>(entitiesCsvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })

  if (entityErrors.length > 0) {
    console.warn(`⚠️  ${entityErrors.length} erreur(s) CSV entreprises`)
    entityErrors.slice(0, 3).forEach(e => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }

  console.log(`📋 ${entityRows.length} lignes lues\n`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (let i = 0; i < entityRows.length; i++) {
    const row = entityRows[i]
    const rowNum = i + 2

    const siret = cleanSiret(row['Siret'] ?? '')
    if (!siret || siret.length < 9) {
      console.warn(`  [L${rowNum}] ⚠️  SIRET invalide : "${row['Siret']}" → ignoré`)
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: rowNum,
        siret: row['Siret'] ?? '',
        nom: (row['Raison sociale'] ?? '').trim(),
        probleme: 'SIRET invalide ou manquant',
        details: `SIRET brut : "${row['Siret'] ?? ''}" — ID CRM : ${row['ID'] ?? ''}`,
      })
      skipped++
      continue
    }

    const name = (row['Raison sociale'] ?? '').trim()
    if (!name) {
      console.warn(`  [L${rowNum}] ⚠️  Raison sociale vide → ignoré`)
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: rowNum,
        siret,
        nom: '',
        probleme: 'Raison sociale vide',
        details: `SIRET : ${siret} — ID CRM : ${row['ID'] ?? ''}`,
      })
      skipped++
      continue
    }

    const crmId = (row['ID'] ?? '').trim() || null
    const region = parseRegion(row['Région'] ?? '')
    const address = parseAddress(row['billing_address_street'] ?? '')
    const postalCode = parseAddress(row['billing_address_postalcode'] ?? '')
    const city = parseAddress(row['billing_address_city'] ?? '')
    const phoneNumber = parseAddress(row['phone_office'] ?? '')

    // Avertissement si région non reconnue (mais on continue quand même)
    const rawRegion = (row['Région'] ?? '').trim()
    if (rawRegion && !rawRegion.includes('#REF') && !rawRegion.includes('#ERROR') && region === null) {
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: rowNum,
        siret,
        nom: name,
        probleme: 'Région non reconnue',
        details: `Région CSV : "${rawRegion}"`,
      })
    }

    try {
      let [existing] = await db
        .select()
        .from(entities)
        .where(eq(entities.siret, siret))
        .limit(1)

      if (!existing && crmId) {
        ;[existing] = await db
          .select()
          .from(entities)
          .where(eq(entities.crmId, crmId))
          .limit(1)
      }

      if (existing) {
        await db
          .update(entities)
          .set({
            name,
            oeId: ECOCERT_OE_ID,
            ...(crmId !== null ? { crmId } : {}),
            ...(region !== null ? { region } : {}),
            ...(address !== null ? { address } : {}),
            ...(postalCode !== null ? { postalCode } : {}),
            ...(city !== null ? { city } : {}),
            ...(phoneNumber !== null ? { phoneNumber } : {}),
            updatedBy: createdBy,
            updatedAt: new Date(),
          })
          .where(eq(entities.id, existing.id))

        updated++
        console.log(`  [L${rowNum}] ✏️  MAJ : ${name}`)
      }
      else {
        await db
          .insert(entities)
          .values({
            name,
            siret,
            type: 'COMPANY',
            mode: 'MASTER',
            oeId: ECOCERT_OE_ID,
            ...(crmId !== null ? { crmId } : {}),
            ...(region !== null ? { region } : {}),
            ...(address !== null ? { address } : {}),
            ...(postalCode !== null ? { postalCode } : {}),
            ...(city !== null ? { city } : {}),
            ...(phoneNumber !== null ? { phoneNumber } : {}),
            createdBy,
            updatedBy: createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

        created++
        console.log(`  [L${rowNum}] ✅ Créé : ${name}`)
      }
    }
    catch (error) {
      const cause = (error as { cause?: unknown }).cause ?? error
      const pgError = cause as { message?: string; code?: string; detail?: string; constraint?: string }
      const details = [
        pgError.message,
        pgError.code ? `code=${pgError.code}` : null,
        pgError.detail,
        pgError.constraint ? `constraint=${pgError.constraint}` : null,
      ].filter(Boolean).join(' | ')
      console.error(`  [L${rowNum}] ❌ Erreur : ${details || error}`)
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: rowNum,
        siret,
        nom: name,
        probleme: 'Erreur technique lors de l\'insertion',
        details: details || String(error),
      })
      skipped++
    }
  }

  console.log('\n─── Passe 1 ───────────────────────────')
  console.log(`✅ Créées       : ${created}`)
  console.log(`✏️  Mises à jour : ${updated}`)
  console.log(`⏭️  Ignorées     : ${skipped}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 2 — Créer les entités mères manquantes
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 2 : création des entités mères...\n')

  const mereFillePath = resolve(import.meta.dirname, 'mere_fille.csv')
  const mereFilleCsvContent = readFileSync(mereFillePath, 'utf-8')

  // Le fichier commence par "# id_fille,..." — on supprime le "# " du header
  const mereFilleCsvCleaned = mereFilleCsvContent.replace(/^# /, '')

  const { data: mereFilleRows, errors: mereFilleErrors } = Papa.parse<MereFilleRow>(mereFilleCsvCleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })

  if (mereFilleErrors.length > 0) {
    console.warn(`⚠️  ${mereFilleErrors.length} erreur(s) CSV mère-fille`)
    mereFilleErrors.slice(0, 3).forEach(e => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }

  console.log(`📋 ${mereFilleRows.length} liens mère-fille lus\n`)

  // Collecter les mères uniques par id_mere
  const meresMap = new Map<string, MereFilleRow>()
  for (const row of mereFilleRows) {
    if (row.id_mere && !meresMap.has(row.id_mere)) {
      meresMap.set(row.id_mere, row)
    }
  }

  let meresCreated = 0
  let meresExisting = 0

  for (const [idMere, row] of meresMap) {
    const siretMere = cleanSiret(row.siret_mere ?? '')
    const nameMere = (row.name_mere ?? '').trim()

    if (!nameMere) continue

    try {
      // Chercher par SIRET ou par crmId
      let existing = null
      if (siretMere && siretMere.length >= 9) {
        const [found] = await db
          .select()
          .from(entities)
          .where(eq(entities.siret, siretMere))
          .limit(1)
        existing = found ?? null
      }
      if (!existing) {
        const [found] = await db
          .select()
          .from(entities)
          .where(eq(entities.crmId, idMere))
          .limit(1)
        existing = found ?? null
      }

      if (existing) {
        meresExisting++
        console.log(`  ✓ Mère déjà présente : ${nameMere}`)
        continue
      }

      // Créer la mère
      const siretToUse = (siretMere && siretMere.length >= 9) ? siretMere : fakeSiret(idMere)

      await db
        .insert(entities)
        .values({
          name: nameMere,
          siret: siretToUse,
          type: 'GROUP',
          mode: 'MASTER',
          oeId: ECOCERT_OE_ID,
          crmId: idMere,
          createdBy,
          updatedBy: createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      meresCreated++
      console.log(`  ✅ Mère créée (GROUP) : ${nameMere} — SIRET: ${siretToUse}`)
    }
    catch (error) {
      console.error(`  ❌ Erreur mère "${nameMere}" : ${error}`)
      report.push({
        passe: 'Passe 2 - Entités mères',
        ligne: '',
        siret: siretMere,
        nom: nameMere,
        probleme: 'Erreur technique lors de la création de l\'entité mère',
        details: String(error),
      })
    }
  }

  console.log('\n─── Passe 2 ───────────────────────────')
  console.log(`✅ Mères créées   : ${meresCreated}`)
  console.log(`✓  Déjà présentes : ${meresExisting}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 3 — Établir les liens mère-fille
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 3 : liens mère-fille...\n')

  let linked = 0
  let linkErrors = 0

  for (const row of mereFilleRows) {
    const idFille = (row.id_fille ?? '').trim()
    const siretFille = cleanSiret(row.siret_fille ?? '')
    const idMere = (row.id_mere ?? '').trim()
    const siretMere = cleanSiret(row.siret_mere ?? '')
    const nameFille = idFille // on utilisera le nom récupéré depuis la DB
    const isMotherMaster = row.is_mother_master === '1'

    if (!idFille || !idMere) continue

    try {
      // Trouver la fille
      let filleEntity = null
      if (idFille) {
        const [found] = await db.select().from(entities).where(eq(entities.crmId, idFille)).limit(1)
        filleEntity = found ?? null
      }
      if (!filleEntity && siretFille && siretFille.length >= 9) {
        const [found] = await db.select().from(entities).where(eq(entities.siret, siretFille)).limit(1)
        filleEntity = found ?? null
      }

      // Trouver la mère
      let mereEntity = null
      if (idMere) {
        const [found] = await db.select().from(entities).where(eq(entities.crmId, idMere)).limit(1)
        mereEntity = found ?? null
      }
      if (!mereEntity && siretMere && siretMere.length >= 9) {
        const [found] = await db.select().from(entities).where(eq(entities.siret, siretMere)).limit(1)
        mereEntity = found ?? null
      }

      if (!filleEntity) {
        console.warn(`  ⚠️  Fille introuvable : id=${idFille}`)
        report.push({
          passe: 'Passe 3 - Liens mère-fille',
          ligne: '',
          siret: siretFille,
          nom: idFille,
          probleme: 'Entité fille introuvable (ni par CRM ID ni par SIRET)',
          details: `ID CRM fille : ${idFille} — SIRET fille : ${siretFille} — Mère attendue : ${idMere}`,
        })
        linkErrors++
        continue
      }
      if (!mereEntity) {
        console.warn(`  ⚠️  Mère introuvable : id=${idMere}`)
        report.push({
          passe: 'Passe 3 - Liens mère-fille',
          ligne: '',
          siret: siretMere,
          nom: filleEntity.name,
          probleme: 'Entité mère introuvable (ni par CRM ID ni par SIRET)',
          details: `ID CRM mère : ${idMere} — SIRET mère : ${siretMere} — Fille : ${filleEntity.name}`,
        })
        linkErrors++
        continue
      }

      await db
        .update(entities)
        .set({
          parentGroupId: mereEntity.id,
          mode: isMotherMaster ? 'FOLLOWER' : 'MASTER',
          updatedBy: createdBy,
          updatedAt: new Date(),
        })
        .where(eq(entities.id, filleEntity.id))

      console.log(`  🔗 ${filleEntity.name} → ${mereEntity.name} (fille ${isMotherMaster ? 'FOLLOWER' : 'MASTER'})`)
      linked++
    }
    catch (error) {
      console.error(`  ❌ Erreur lien fille="${idFille}" mère="${idMere}" : ${error}`)
      report.push({
        passe: 'Passe 3 - Liens mère-fille',
        ligne: '',
        siret: siretFille,
        nom: idFille,
        probleme: 'Erreur technique lors de la création du lien',
        details: String(error),
      })
      linkErrors++
    }
  }

  console.log('\n─── Passe 3 ───────────────────────────')
  console.log(`🔗 Liens créés : ${linked}`)
  console.log(`❌ Erreurs     : ${linkErrors}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 4 — Importer les pilotes de la démarche
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 4 : import des pilotes de la démarche...\n')

  const pilotesCsvPath = resolve(import.meta.dirname, 'pilotes.csv')
  const pilotesCsvContent = readFileSync(pilotesCsvPath, 'utf-8')

  type PiloteRow = Record<string, string>

  const { data: piloteRows, errors: piloteErrors } = Papa.parse<PiloteRow>(pilotesCsvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })

  if (piloteErrors.length > 0) {
    console.warn(`⚠️  ${piloteErrors.length} erreur(s) CSV pilotes`)
    piloteErrors.slice(0, 3).forEach(e => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }

  console.log(`📋 ${piloteRows.length} lignes lues (avant déduplication)\n`)

  // Dédupliquer : garder le premier pilote par ID_E
  const pilotesMap = new Map<string, PiloteRow>()
  for (const row of piloteRows) {
    const idE = (row['ID_E'] ?? '').trim()
    if (idE && !pilotesMap.has(idE)) {
      pilotesMap.set(idE, row)
    }
  }

  let pilotesLinked = 0
  let pilotesNotFound = 0

  for (const [idE, row] of pilotesMap) {
    try {
      const [entity] = await db
        .select()
        .from(entities)
        .where(eq(entities.crmId, idE))
        .limit(1)

      if (!entity) {
        console.warn(`  ⚠️  Entité introuvable pour pilote crmId=${idE}`)
        const lastName = (row['Nom de Famille'] ?? '').trim()
        const firstName = (row['Prénom'] ?? '').trim()
        report.push({
          passe: 'Passe 4 - Pilotes',
          ligne: '',
          siret: '',
          nom: `${firstName} ${lastName}`.trim(),
          probleme: 'Entité introuvable pour ce pilote (CRM ID inconnu)',
          details: `ID CRM entité : ${idE} — Pilote : ${firstName} ${lastName} — Email : ${row['Adresse Email'] ?? ''}`,
        })
        pilotesNotFound++
        continue
      }

      const lastName = (row['Nom de Famille'] ?? '').trim()
      const firstName = (row['Prénom'] ?? '').trim()
      const email = (row['Adresse Email'] ?? '').trim()
      const mobile = (row['Tél Mobile'] ?? '').trim()
      const fixe = (row['Téléphone'] ?? '').trim()
      const phone = mobile || fixe
      const fonction = (row['Fonction'] ?? '').trim()

      const fieldsToInsert: { fieldKey: string; value: string }[] = []
      if (lastName) fieldsToInsert.push({ fieldKey: 'pilotLastName', value: lastName })
      if (firstName) fieldsToInsert.push({ fieldKey: 'pilotFirstName', value: firstName })
      if (email) fieldsToInsert.push({ fieldKey: 'pilotEmail', value: email })
      if (phone) fieldsToInsert.push({ fieldKey: 'pilotPhone', value: phone })
      if (fonction) fieldsToInsert.push({ fieldKey: 'pilotRole', value: fonction })

      for (const field of fieldsToInsert) {
        await db.insert(entityFieldVersions).values({
          entityId: entity.id,
          fieldKey: field.fieldKey,
          valueString: field.value,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          createdBy,
          createdAt: new Date(),
        })
      }

      console.log(`  ✅ Pilote : ${firstName} ${lastName} → ${entity.name}`)
      pilotesLinked++
    }
    catch (error) {
      console.error(`  ❌ Erreur pilote crmId=${idE} : ${error}`)
      report.push({
        passe: 'Passe 4 - Pilotes',
        ligne: '',
        siret: '',
        nom: idE,
        probleme: 'Erreur technique lors de l\'insertion du pilote',
        details: String(error),
      })
      pilotesNotFound++
    }
  }

  console.log('\n─── Passe 4 ───────────────────────────')
  console.log(`✅ Pilotes rattachés : ${pilotesLinked}`)
  console.log(`⚠️  Non trouvés      : ${pilotesNotFound}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 5 — Importer les dates de première labellisation
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 5 : dates de première labellisation...\n')

  const datesCsvPath = resolve(import.meta.dirname, 'dates-labellisation.csv')
  const datesCsvContent = readFileSync(datesCsvPath, 'utf-8')

  const { data: datesRows, errors: datesErrors } = Papa.parse<Record<string, string>>(datesCsvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })

  if (datesErrors.length > 0) {
    console.warn(`⚠️  ${datesErrors.length} erreur(s) CSV dates`)
    datesErrors.slice(0, 3).forEach(e => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }

  // Dédupliquer par SIRET en gardant la date la plus ancienne
  const datesMap = new Map<string, Date>()
  for (const row of datesRows) {
    const rawSiret = (row['SIRET'] ?? '').replace(/[\s\n"]/g, '').trim()
    if (!rawSiret || rawSiret.length < 9) continue

    const rawDate = (row['Date de labellisation'] ?? '').trim()
    if (!rawDate) continue

    const parts = rawDate.split('/')
    if (parts.length !== 3) continue
    const d = parseInt(parts[0])
    const m = parseInt(parts[1]) - 1
    const y = parseInt(parts[2])
    if (isNaN(d) || isNaN(m) || isNaN(y)) continue
    const parsed = new Date(y, m, d)

    const existing = datesMap.get(rawSiret)
    if (!existing || parsed < existing) {
      datesMap.set(rawSiret, parsed)
    }
  }

  console.log(`📋 ${datesMap.size} SIRET uniques avec date\n`)

  let datesLinked = 0
  let datesNotFound = 0

  for (const [siret, date] of datesMap) {
    try {
      const [entity] = await db
        .select()
        .from(entities)
        .where(eq(entities.siret, siret))
        .limit(1)

      if (!entity) {
        console.warn(`  ⚠️  Entité introuvable pour SIRET=${siret}`)
        report.push({
          passe: 'Passe 5 - Dates de labellisation',
          ligne: '',
          siret,
          nom: '',
          probleme: 'SIRET inconnu dans la base (pas d\'entité correspondante)',
          details: `SIRET : ${siret} — Date de labellisation : ${date.toLocaleDateString('fr-FR')}`,
        })
        datesNotFound++
        continue
      }

      await db.insert(entityFieldVersions).values({
        entityId: entity.id,
        fieldKey: 'firstLabelingDate',
        valueString: null,
        valueNumber: null,
        valueBoolean: null,
        valueDate: date,
        createdBy,
        createdAt: new Date(),
      })

      console.log(`  ✅ ${entity.name} → ${date.toLocaleDateString('fr-FR')}`)
      datesLinked++
    }
    catch (error) {
      console.error(`  ❌ Erreur SIRET=${siret} : ${error}`)
      report.push({
        passe: 'Passe 5 - Dates de labellisation',
        ligne: '',
        siret,
        nom: '',
        probleme: 'Erreur technique lors de l\'insertion de la date',
        details: String(error),
      })
      datesNotFound++
    }
  }

  console.log('\n─── Passe 5 ───────────────────────────')
  console.log(`✅ Dates insérées : ${datesLinked}`)
  console.log(`⚠️  Non trouvées  : ${datesNotFound}`)
  console.log('────────────────────────────────────────\n')

  writeReport(report, import.meta.dirname)

  await pool.end()
  console.log('🏁 Import terminé')
}

seedEntities().catch((error) => {
  console.error(error)
  process.exit(1)
})
