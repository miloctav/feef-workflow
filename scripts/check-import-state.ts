import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.NUXT_DATABASE_URL })

const sirets = [
  '38466458700035', // GROUPE LE GRAET
  '53844935600020', // GROUPE SECO
  '3732059500079',  // COMPAGNIE DU MIDI
  '1575153000013',  // MULOT ET PETITJEAN
  '31945020100037', // LAITERIE DE VARENNES
  '4800572980014',  // NOUVELLE FROMAGERIE DE VAUDES
  '41420362000094', // TREO
  '39428016800011', // LE BATISTOU
  '34184205200027', // MARO OCEANS
  '82038874200018', // LECHEF BRETAGNE INTERNATIONAL
  '52812654800010', // GALILEO SAS
  '53445511800040', // FOODIZ SOLUTIONS (corrigé)
]

const crmIds = [
  '1350203e-f7dd-11e9-b90e-fa163eb33c65', // GROUPE LE GRAET
  'e197f85a-69ad-11ed-b81f-fa163e4cbe98', // GROUPE SECO
]

async function main() {
  console.log('\n=== Recherche par SIRET ===')
  for (const s of sirets) {
    const r = await pool.query('SELECT id, name, siret, crm_id, type, mode FROM entities WHERE siret = $1', [s])
    if (r.rows.length === 0) {
      console.log(`SIRET ${s}: NOT FOUND`)
    } else {
      r.rows.forEach((row) => console.log(`SIRET ${s}: ${row.name} (id=${row.id}, crm=${row.crm_id}, type=${row.type})`))
    }
  }
  console.log('\n=== Recherche par CRM ID (sociétés à problème) ===')
  for (const c of crmIds) {
    const r = await pool.query('SELECT id, name, siret, crm_id, type, mode FROM entities WHERE crm_id = $1', [c])
    if (r.rows.length === 0) {
      console.log(`CRM ${c}: NOT FOUND`)
    } else {
      r.rows.forEach((row) => console.log(`CRM ${c}: ${row.name} (id=${row.id}, siret=${row.siret}, type=${row.type})`))
    }
  }
  console.log('\n=== Entités avec SIRET FAKE_ (créées Passe 2) ===')
  const fake = await pool.query("SELECT id, name, siret, crm_id FROM entities WHERE siret LIKE 'FAKE_%' ORDER BY name")
  console.log(`${fake.rows.length} entité(s) avec FAKE siret:`)
  fake.rows.forEach((r) => console.log(`  - ${r.name} (${r.siret}, crm=${r.crm_id})`))

  console.log('\n=== Total entités ===')
  const total = await pool.query('SELECT COUNT(*)::int AS n FROM entities')
  console.log(`Total : ${total.rows[0].n}`)

  console.log('\n=== Total entityFieldVersions (dates + pilotes) ===')
  const fv = await pool.query("SELECT field_key, COUNT(*)::int AS n FROM entity_field_versions GROUP BY field_key ORDER BY field_key")
  fv.rows.forEach((r) => console.log(`  - ${r.field_key} : ${r.n}`))

  console.log('\n=== Couverture ecocertId ===')
  const cov = await pool.query("SELECT COUNT(*)::int AS total, COUNT(ecocert_id)::int AS with_id FROM entities")
  console.log(`  ${cov.rows[0].with_id} / ${cov.rows[0].total} entités ont un ecocert_id`)

  console.log('\n=== Échantillon entités avec ecocert_id ===')
  const sample = await pool.query("SELECT id, name, siret, ecocert_id FROM entities WHERE ecocert_id IS NOT NULL ORDER BY id LIMIT 10")
  sample.rows.forEach((r) => console.log(`  - [${r.id}] ${r.name} (siret=${r.siret}, ecocert=${r.ecocert_id})`))

  console.log('\n=== GROUPE LE GRAET et GROUPE SECO ===')
  const grp = await pool.query("SELECT id, name, siret, ecocert_id FROM entities WHERE name IN ('GROUPE LE GRAET', 'GROUPE SECO')")
  grp.rows.forEach((r) => console.log(`  - [${r.id}] ${r.name} (siret=${r.siret}, ecocert=${r.ecocert_id})`))

  await pool.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
