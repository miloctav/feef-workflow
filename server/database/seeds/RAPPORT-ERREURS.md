# Rapport d'erreurs d'import — 18 mai 2026

Après réimport complet, **301 anomalies** subsistent dans les rapports
`rapport-entities-2026-05-18.csv` et `rapport-audits-2026-05-18.csv`.
Toutes correspondent à des **données sources incomplètes ou incohérentes**,
pas à un dysfonctionnement du seed.

## Résumé

| # | Catégorie | Anomalies | Entreprises distinctes |
|---|-----------|-----------|------------------------|
| 1 | Pilotes orphelins (CRM ID entité inconnu) | 6 | 6 |
| 2 | Dates de labellisation sur SIRET inconnu | 9 | 9 |
| 3 | Audits sur SIRET inconnu (entreprise absente) | 205 | 73 |
| 4 | Audits sans SIRET dans le CSV | 81 | 39 |

## 1. Pilotes orphelins — 6 cas

`pilotes.csv` contient 6 pilotes rattachés à un CRM ID d'entité qui
n'existe pas dans `entities.csv`. Exemple : Fabiola MAILLARD pour
`02f5ddd6-e8de-11e9-a30b-fa163eb33c65`.

**Cause probable** : ces entreprises ne sont plus dans l'export CRM des
entités (sorties FEEF, fusions, erreur de cochage CRM signalée par l'équipe).

**Correction** : régénérer `pilotes.csv` après nettoyage côté CRM, ou ajouter
manuellement les entités manquantes dans `entities.csv` puis relancer
`npm run db:seed-entities`.

## 2. Dates de labellisation sur SIRET inconnu — 9 cas

Les 9 SIRET concernés ne correspondent à aucune entité dans `entities.csv` :

- `3732059500079` (COMPAGNIE DU MIDI) — un autre établissement existe (`3732059500020`)
- `41420362000094` (TREO) — un autre établissement existe (`41420362000052`)
- `39428016800011` (LE BATISTOU) — SIREN différent en base (`52929577600015`)
- `31945020100037` (LAITERIE DE VARENNES) — absent
- `4800572980014` (NOUVELLE FROMAGERIE DE VAUDES) — absent
- `34184205200027` (MARO OCEANS) — absent
- `82038874200018` (LECHEF BRETAGNE INTERNATIONAL) — absent
- `52812654800010` (GALILEO SAS) — absent
- (1 cas LSDH lié au groupe LSDH absent)

**Correction** : trancher au cas par cas — soit modifier `dates-labellisation.csv`
pour pointer vers le bon établissement déjà en base, soit ajouter l'entreprise
dans `entities.csv`.

## 3. Audits sur SIRET inconnu — 205 audits / 73 entreprises

Ces audits portent sur des entreprises dont le SIRET est valide mais absent
de la base FEEF. Exemples : HYGIENE ET NATURE (`1715010300046`), POULIQUEN
(`63632053300012`), CHICHE (`821064847`), MARO-OCEANS, ROUTIN, MULOT ET
PETITJEAN sur d'autres établissements, etc.

**Cause** : l'export CRM `entities.csv` ne couvre pas l'intégralité du
périmètre des audits Ecocert (entreprises ayant quitté FEEF, en cours
d'intégration, ou non encore référencées).

**Correction** : fournir un CSV complémentaire des 73 entreprises manquantes
(SIRET + raison sociale + adresse + groupe de rattachement éventuel), à
fusionner dans `entities.csv` puis relancer les deux seeds. La liste
détaillée est dans `rapport-audits-2026-05-18.csv` colonne `nom`.

## 4. Audits sans SIRET dans le CSV — 81 audits / 39 entreprises

Le CSV Ecocert ne fournit pas de SIRET pour ces audits. Principaux comptes
concernés (par volume) :

- LOBODIS, WOLF LINGERIE : 5 audits chacun
- Collectif AEB services, LPA - LES P'TITS AMOUREUX, ST HUBERT : 4 chacun
- ALTHO, CIDRES LEBRUN, CULTURE MIEL, COMPAGNIE DES PATISSIERS, RICA LEWIS,
  BOYAUDERIE SISTERONNAISE, EXTRUPLAST : 3 chacun
- 28 autres entreprises avec 1 ou 2 audits

**Correction** : compléter la colonne `SIRET` de `audits-ecocert.csv` à partir
de l'INSEE/Sirene pour chaque entreprise, puis relancer
`npm run db:seed-audits`. Si l'entreprise est ensuite absente de `entities.csv`,
elle basculera dans la catégorie 3.

## Procédure de relance après correction

```powershell
npm run db:seed-entities    # wipe entityFieldVersions + Passes 1-6
npm run db:seed-audits      # wipe audits + dépendances + réimport
```

Les seeds sont idempotents : ils convergent vers le même état à chaque
exécution à partir des CSV sources.
