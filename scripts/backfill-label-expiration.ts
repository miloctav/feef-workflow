/**
 * Backfill de audits.label_expiration_date
 *
 * Les audits importés par seed-audits.ts avant cette correction ont été créés
 * sans labelExpirationDate. Ce champ est pourtant la source de vérité pour
 * savoir si une entité est actuellement labellisée (dashboard, cron de
 * relance avant expiration).
 *
 * Ce script pose, pour chaque audit COMPLETED / ACCEPTED dont le champ est
 * NULL, la date de décision FEEF + 1 an. La date de décision est lue dans
 * l'événement AUDIT_FEEF_DECISION_ACCEPTED de l'audit, avec repli sur sa date
 * de fin d'audit.
 *
 * Idempotent : les audits ayant déjà une date ne sont jamais modifiés.
 *
 * Avec --repair, corrige aussi les dates déjà présentes mais erronées. Utile
 * une fois : les dates posées avant la correction du calcul (toISOString sur
 * une date locale) sont décalées d'un jour trop tôt.
 *
 * Usage : npx tsx scripts/backfill-label-expiration.ts [--dry-run] [--repair]
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { computeLabelExpirationDate } from '../shared/utils/label'

const isDryRun = process.argv.includes('--dry-run')
const isRepair = process.argv.includes('--repair')

async function main() {
  const pool = new Pool({ connectionString: process.env.NUXT_DATABASE_URL })

  try {
    const { rows } = await pool.query<{
      id: number
      decision_date: Date | null
      actual_end_date: Date | null
      current_expiration: string | null
    }>(`
      SELECT a.id,
             (SELECT e.performed_at FROM events e
               WHERE e.audit_id = a.id
                 AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
               ORDER BY e.performed_at DESC
               LIMIT 1) AS decision_date,
             a.actual_end_date,
             TO_CHAR(a.label_expiration_date, 'YYYY-MM-DD') AS current_expiration
      FROM audits a
      WHERE a.deleted_at IS NULL
        AND a.status = 'COMPLETED'
        AND a.feef_decision = 'ACCEPTED'
        AND (a.label_expiration_date IS NULL OR $1)
      ORDER BY a.id
    `, [isRepair])

    console.log(`🔎 ${rows.length} audit(s) examiné(s)${isRepair ? ' (mode réparation)' : ''}`)

    let filled = 0
    let repaired = 0
    let alreadyCorrect = 0
    let skipped = 0

    for (const row of rows) {
      const decisionDate = row.decision_date ?? row.actual_end_date
      if (!decisionDate) {
        console.warn(`  ⚠️  Audit ${row.id} : ni décision ni date de fin, ignoré`)
        skipped++
        continue
      }

      const labelExpirationDate = computeLabelExpirationDate(new Date(decisionDate))

      if (row.current_expiration === labelExpirationDate) {
        alreadyCorrect++
        continue
      }

      if (row.current_expiration) {
        console.log(`  🔧 Audit ${row.id} : ${row.current_expiration} → ${labelExpirationDate}`)
        repaired++
      }
      else {
        filled++
      }

      if (!isDryRun) {
        await pool.query(
          'UPDATE audits SET label_expiration_date = $1 WHERE id = $2',
          [labelExpirationDate, row.id],
        )
      }
    }

    const prefix = isDryRun ? '🧪 [dry-run] ' : '✅ '
    console.log(`${prefix}${filled} date(s) posée(s), ${repaired} corrigée(s), ${alreadyCorrect} déjà correcte(s), ${skipped} ignorée(s)`)
  }
  finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('❌ Erreur lors du backfill :', error)
  process.exit(1)
})
