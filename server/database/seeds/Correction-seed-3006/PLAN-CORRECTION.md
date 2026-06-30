# Correction de l'import | retours FEEF + Ecocert (30 juin 2026)

Ce document fige la logique appliquée pour intégrer les retours de la FEEF et
d'Ecocert sur l'import des entités et des audits, et le résultat obtenu.

Tous les retours sont dans `server/database/seeds/Correction-seed-3006/` :
- `Export FEEF 2_2026-06-29-1817.csv` : export Ecocert corrigé (audits).
- `Copie de ECOCERT ... CORRECTION TGX.xlsx` : corrections Ecocert (doublons).
- `FEEF rapport-qualite-audits-2026-06-11.xlsx` : réponses FEEF (4 onglets).
- `Final Données SGS.xlsx` : entités + audits SGS.
- `Nouveaux Ecocert.xlsx` : nouveaux labellisés Ecocert.

## Principe

Aucune donnée n'est éditée à la main de façon non rejouable. Chaque décision
est encodée dans un fichier d'entrée consommé par les seeds, qui restent
idempotents. On relance ensuite `db:seed-entities` puis `db:seed-audits`.

## Règles métier validées

1. **Source audits** : `audits-ecocert.csv` remplacé par l'export corrigé du
   30/06 (biopartenaire purgé par Ecocert, SIRET corrigés, colonnes `AUDIT_ID`
   et `SCHEME_NAME`). Seuls les audits `Contracted` sont importés.
2. **Invariant parent/fille** : sur un lien, un seul côté est MASTER. Si parent
   et fille sont tous deux MASTER, on casse le lien (chacune autonome). Si le
   parent est FOLLOWER (groupe non labellisé), on garde le lien et la fille
   reste MASTER.
3. **Règle FOLLOWER** : une entité suiveuse ne porte pas d'ecocertId et on
   n'importe pas ses audits (la labellisation découle du groupe / siège,
   confirmé par Ecocert pour le multisite). Le seed produit la liste de ces
   entités (onglet « Suiveuses ignorées »).
4. **Doublons ECOCERT_ID** : on conserve l'historique d'audits de la même
   société, l'`ecocertId` unique de l'entité est le dossier « porteur du
   contrat » désigné par Ecocert. Les codes d'une autre société non suivie sont
   exclus (COURBEYRE 274849, CAROLA en abandon 84482).
5. **Nouvelles entités** : 11 nouveaux Ecocert + GOULIBEUR (minimal) + 8 SGS
   (nouvel OE « SGS », audits planifiés). TDM = `33203790200019`, ARDEA = SIRET
   de la fiche Nouveaux Ecocert (`...377`).
6. **Non-rattachés** : sortants et biopartenaire validés par la FEEF, listés en
   « validés » et non comptés comme anomalie ouverte. SODALIS et ROSTAIN, qui
   sont de vraies entreprises suivies (SIRET absent / typé côté Ecocert), sont
   rattachées par override.

## Fichiers d'entrée créés ou enrichis

| Fichier | Rôle |
|---------|------|
| `audits-ecocert.csv` | Remplacé par l'export corrigé (sauvegarde : `.bak-avant-3006`) |
| `entities-additional.csv` | Nouvelles entités Ecocert + SGS + groupes parents |
| `audits-sgs.csv` | Audits SGS (type / statut / date) |
| `entity-mode-overrides.csv` | Mode maître/suiveuse par SIRET (50 entités) |
| `ecocert-canonical.csv` | ecocertId porteur par entité (doublons) |
| `audits-excluded-codes.csv` | Codes Ecocert d'autres sociétés non suivies |
| `audits-validated-nonmatches.csv` | Sortants / biopartenaire validés FEEF |
| `audits-rattachement-overrides.csv` | + Lucien Georgelin, SODALIS, ROSTAIN |
| `forced-parent-links.csv` | + rattachements suiveuses (MASTER sans audit) |

Code : passes 7 (entités additionnelles), 8 (overrides de mode) et 9 (invariant
+ nettoyage ecocertId suiveuses) ajoutées à `seed-entities.ts` ; règle FOLLOWER,
exclusions, ecocertId canonique, import SGS et bilan ajoutés à `seed-audits.ts`.

## Résultat (relance des deux seeds)

- Entités : 325 actives. Audits : 987 (979 Ecocert contractés + 8 SGS).
- **Anomalies ouvertes : 0** (51 non-rattachés, tous sortants validés FEEF).
- FOLLOWER avec audits : 0 (reclassements appliqués).
- MASTER sans audit : 9, tous validés (têtes de groupe « maître » + autonomes
  sans audit encore : SAINT BERNARD, TERRE D'EMBRUNS, SNCD futur candidat).
- Doublons ECOCERT_ID : 4 (historique conservé, ecocertId canonique posé).
- Suiveuses ignorées : 9 entités, 28 audits non importés (ecocertId retiré).
- 8 anomalies entités bénignes et préexistantes (auto-référence parent, dates
  « en cours labellisation »).

## Relance

```powershell
npm run db:seed-entities
npm run db:seed-audits
```

Les rapports sont régénérés dans `server/database/seeds/` :
`rapport-qualite-audits-<date>.xlsx` (onglets), `rapport-audits-<date>.csv`,
`rapport-entities-<date>.csv`.
