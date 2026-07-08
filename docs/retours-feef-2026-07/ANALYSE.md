# Analyse des retours FEEF | navigation du 08/07/2026

Document de travail interne. Aucune correction n'a été appliquée : ce rapport ne fait qu'établir la cause de chaque point remonté par Emmanuelle.

> Support de présentation : ouvrir `rapport.html` dans un navigateur.

---

## Synthèse

Quinze remarques ont été remontées. Elles se ramènent à **trois causes racines**, **un bug de rendu**, **un problème d'environnement**, et une série de **fonctionnalités jamais implémentées** (qui ne sont donc pas des régressions).

| # | Cause racine | Points expliqués |
|---|---|---|
| **A** | Filtre « audits en cours » actif par défaut, invisible, non désactivable | Bouvard « il manque des audits », LSDH « pas d'historique », Maison Collet apparemment vide |
| **B** | Mapping incomplet des statuts Ecocert (197 lignes sur 1060 non reconnues) | Audits 2022/2023 en « planifié », faux audit initial de Bouvard |
| **C** | L'UI n'affiche les suiveuses que si `type === GROUP` | LSDH sans ses suiveuses dans le workflow, alors qu'elles sont dans l'export |
| **D** | `destroy()` de Chart.js pendant l'animation du chart fantôme | Les deux graphiques du dashboard restent blancs |
| **E** | `NUXT_DEV_MODE=true` en production | Sarah n'a pas reçu son email d'activation |

**Point important : la donnée importée est saine.** Aucun des symptômes constatés ne vient d'un import raté. Les entités et les audits sont en base, correctement rattachés. Ce qui manque, c'est l'affichage, et deux ou trois libellés qui induisent en erreur.

---

## A. Le filtre « audits en cours » masque tout l'historique

### Mécanisme

`app/components/tables/AuditsTable.vue:157-162` :

```js
const urlStatus = route.query.status as string | undefined
const initialFilters = urlStatus
  ? { status: urlStatus.includes(',') ? urlStatus.split(',') : [urlStatus] }
  : { inProgress: true }   // ← filtre par défaut
```

`inProgress: true` exclut côté serveur les statuts `COMPLETED`, `REFUSED_BY_OE` et `REFUSED_PLAN` (`server/api/audits/index.get.ts:91-98`).

Or ce même composant est monté **sans barre de filtres** (`:has-filters="false"`) dans :

- l'onglet Audits de la fiche entité FEEF | `app/components/pages/EntityPage.vue:56-67`
- la page « Mes audits » côté entreprise | `app/pages/entity/audits/index.vue:15`

Le bloc `#filters` n'est alors pas rendu. **L'utilisateur ne voit ni le filtre, ni le moyen de le retirer.** Les audits terminés n'existent tout simplement pas à l'écran.

### Conséquences observées

- **Biscuiterie Bouvard** : 7 audits en base, 5 en `COMPLETED` donc masqués. Seuls les 2 non terminaux s'affichent.
- **LSDH, connectée en gestionnaire de dossier** : 8 audits `COMPLETED` sur 10, invisibles.
- **Maison Collet** : son unique audit est `COMPLETED`. L'onglet paraît **entièrement vide**, ce qui a fait croire à un import raté.

### Vérification proposée

Ouvrir la fiche Maison Collet et ajouter `?status=COMPLETED` à l'URL : le composant lit `route.query.status` (`AuditsTable.vue:157`). Si l'audit apparaît, l'import est confirmé bon.

### Bugs annexes trouvés au passage

- `app/composables/useAudits.ts:22` : la `cacheKey` vaut `audits-entity-${entityId}` **sans tenir compte des filtres**.
- `EntityPage.vue:158` appelle `setAuditFilters({ entityId })` sur une **autre instance** de `useAudits()` (clé `audits`, sans `entityId`). L'appel est inopérant sur la table affichée.

---

## B. Le mapping des statuts Ecocert est incomplet

### Comment le statut est déterminé à l'import

Le fichier source est `server/database/seeds/audits-ecocert.csv` (1126 lignes).

1. **Filtre contrat** | seules les lignes `STATUT_CONTRAT = Contracted` sont importées. 1060 sur 1126. Les 66 `Not contracted` sont ignorées (`seed-audits.ts:235-237`).
2. **Filtre suiveuse** | si l'entité rattachée est `mode = FOLLOWER`, ses audits ne sont pas importés : le label est porté par le groupe ou le siège. Règle validée par Ecocert (`seed-audits.ts:540-549`).
3. **Traduction du statut** | la colonne `AUDIT_STATUT` d'Ecocert est traduite en statut de workflow FEEF par un `switch` (`seed-audits.ts:36-57`).

```js
function mapAuditStatus(csvStatus, actualEndDate, plannedDate) {
  let status
  switch (csvStatus.trim().toLowerCase()) {
    case '4-certification finished':       return 'COMPLETED'
    case '3-inspection finished - pool':   return 'PENDING_OE_OPINION'
    case '3-certification in progress':
    case '3-certification order accepted': return 'PENDING_FEEF_DECISION'
    case '2-inspection in progress':
      if (actualEndDate && actualEndDate < new Date()) return 'PENDING_REPORT'
      status = 'SCHEDULED'; break
    default:                               status = 'PLANNING'   // ← tout le reste
  }
  if (status === 'PLANNING'  && plannedDate) return 'SCHEDULED'
  if (status === 'SCHEDULED' && !plannedDate) return 'PLANNING'
  return status
}
```

**La dernière étape est celle qui pose problème** : tout statut non reconnu tombe dans le `default` → `PLANNING`, puis devient `SCHEDULED` dès qu'une `PLANNED_DATE` existe, **sans aucun contrôle sur l'année**.

### Répartition réelle (lignes `Contracted`)

| `AUDIT_STATUT` source | Reconnu | Statut importé | Lignes |
|---|:---:|---|---:|
| `4-Certification finished` | oui | `COMPLETED` | 852 |
| `2-Inspector's Infoportal` | **non** | `PLANNING` | 80 |
| `2-Inspector's Infoportal` | **non** | `SCHEDULED` | 10 |
| `2-Inspection order accepted` | **non** | `PLANNING` | 64 |
| `2-Inspection order accepted` | **non** | `SCHEDULED` | 41 |
| `1-Inspection order created` | **non** | `PLANNING` | 2 |
| `3-Inspection finished - Pool` | oui | `PENDING_OE_OPINION` | 4 |
| `3-Certification order accepted` | oui | `PENDING_FEEF_DECISION` | 4 |
| `3-Certification in progress` | oui | `PENDING_FEEF_DECISION` | 2 |
| `2-Inspection in progress` | oui | `PLANNING` | 1 |
| | | **Total** | **1060** |

**197 lignes sur 1060 tombent dans le `default`.**

### Nuance importante

`2-Inspector's Infoportal` et `2-Inspection order accepted` désignent des audits **commandés mais pas encore réalisés**. Les classer en `PLANNING` / `SCHEDULED` est donc **fonctionnellement correct**. Le `default` a bon goût par accident.

Le vrai problème est ailleurs : **quand la commande date de 2022, l'audit est mort, pas planifié.**

### Les 3 audits fantômes

Ce sont les seuls `SCHEDULED` avec une date passée. Tous portent le même statut source non reconnu, `2-Inspector's Infoportal` :

| Année | Client | Type d'audit | Ecocert ID | Audit ID |
|---|---|---|---|---|
| 2022 | **BISCUITS BOUVARD SAS** | Initial inspection | 62851 | 1227068 |
| 2022 | CSP Paris Fashion Group | Additional inspection | 203932 | 1256703 |
| 2022 | LOC MARIA BISCUITS | Renewal audit | 188498 | 1261134 |

Emmanuelle a vu **les deux faces du même incident** : ces audits apparaissent dans le tableau « planifié » du dashboard, et celui de Bouvard est le doublon Ecocert qui lui fait dire « l'audit initial n'est pas en fini ». Le vrai audit initial de Bouvard (`1218084`, 2022) est bien `COMPLETED` | simplement masqué par la cause A.

**Décision attendue de la FEEF** sur ces 3 audits, plus un moyen de les traiter dans l'interface (voir « Besoin nouveau » en fin de document).

### Vérification croisée des chiffres du dashboard

Le mapping produit **147 `PLANNING`** et **48 `SCHEDULED` en 2026**. Avec les 8 audits SGS, cela donne les « 142 en planification + 56 planifiés » du dashboard. Les compteurs sont cohérents avec la donnée.

---

## C. Les suiveuses de LSDH sont invisibles dans le workflow

### La donnée est correcte

LSDH (SIRET `8558149400029`) a bien ses 4 suiveuses en base, toutes en `parentGroupId = LSDH`, `mode = FOLLOWER` :

- L'ABEILLE
- LES CRUDETTES
- JUS DE FRUITS D'ALSACE
- FRUITS ET SAVEURS

Confirmé dans le xlsx source, dans `mere_fille.csv:15,19,22,25` et dans `entites-all.csv`. Il n'existe **qu'une seule entité LSDH**, aucun doublon groupe/société.

### La cause

**LSDH est enregistrée en `type = COMPANY`, pas en `type = GROUP`.**

Le seed ne promeut une mère en `GROUP` que dans deux cas :
- si elle est **créée de toutes pièces** par la passe 2 (`seed-entities.ts:686`) ;
- si elle est forcée via `forced-parent-links.csv` (passe 3bis, `seed-entities.ts:865-870`).

Une mère **déjà présente dans le xlsx avec son propre SIRET**, comme LSDH, conserve son `type = COMPANY` : `makeGroup` vaut `false` dès qu'un SIRET réel est fourni (`seed-entities.ts:577`, `:656-663`). La passe 3 pose bien `parentGroupId` et `mode` sur les filles, mais **ne touche jamais au `type` de la mère** (`:796-806`).

Or l'UI discrimine sur le type :

```
type === GROUP    → affiche childEntities        (OK)
type === COMPANY  → affiche parentGroup, et seulement si parentGroup.mode === 'FOLLOWER'
```

`app/components/entity/EntityCase.vue:698-751` et `app/components/entity/EntityFollowers.vue:32-52`.

LSDH étant `COMPANY`, l'UI cherche **son** parent (`null`) et affiche « Aucun groupe ». Ses 4 `childEntities` sont pourtant bien chargées par l'API (`server/api/entities/[id]/index.get.ts:68-84`), mais **jamais lues**.

### Pourquoi l'export les montre

L'export lit la relation **dans l'autre sens** : chaque fille charge son `parentGroup` et écrit son nom (`server/api/entities/export.get.ts:145`, `:214`). D'où le « pas rattachées dans le workflow, mais ok sur l'extract ».

### Décision

Le modèle a deux axes indépendants (`type` COMPANY/GROUP, `mode` MASTER/FOLLOWER) et l'UI n'en respecte qu'un. **Décision prise : LSDH sera passée en `GROUP` manuellement via l'interface.** Le cas « COMPANY MASTER portant des suiveuses » est jugé incohérent et ne sera pas supporté.

À surveiller : `EntityCase.vue:686-692` calcule `existing-count` comme `parentGroupId ? 1 : 0`, ce qui confirme que l'UI ne prévoit qu'un seul lien pour une COMPANY.

---

## D. Les graphiques du dashboard restent blancs

### Symptôme

Les deux titres (`Audits prévus par mois`, `Labellisés par année`) s'affichent | ils sont dans `DashboardPage.vue:648` et `:653`, **en dehors** des composants de graphique. En dessous, canvas blanc.

Console :

```
Uncaught TypeError: Cannot read properties of null (reading 'save')
    at Bt._drawDataset
    at Bt._drawDatasets
    at Bt.draw
    at ul._update
```

Le `ctx` du canvas est `null` au moment du dessin : **Chart.js dessine une instance déjà détruite.**

### Mécanisme

`LineChartAudits.vue` et `BarChartLabellises.vue` partagent le même code :

```js
onMounted(() => renderChart())
watch(scheduledAuditsChartData, () => renderChart())

function renderChart() {
  if (!chartRef.value || !scheduledAuditsChartData.value) return
  if (chartInstance.value) chartInstance.value.destroy()
  chartInstance.value = new Chart(...)
}
```

Séquence en production :

1. Les composants enfants sont montés **avant** le parent. À ce moment `data` est `null`, mais le computed retourne `{ labels: [], initial: [], … }` | un objet **truthy** (`useDashboardOverview.ts:68`). Le garde `if (!…) return` **ne protège donc rien** : un « chart fantôme » vide est créé, et son animation démarre.
2. `DashboardPage` monte et appelle `fetchOverview()` (`:44`).
3. La réponse arrive, `data.value` change, le computed recalcule, le `watch` déclenche `renderChart()`.
4. `destroy()` met `ctx = null` **pendant que l'animation du chart fantôme tourne encore**. L'animator garde la référence, appelle `draw()` au frame suivant, et lève l'exception.
5. L'exception casse la boucle de rendu de l'animator, **partagée entre tous les charts**. Les deux canvas restent blancs.

Cela explique que le bug ne se voie pas en local : le fetch y est assez rapide pour arriver avant le mount.

### Aggravant

`chartInstance` est un `ref()` (`LineChartAudits.vue:29`, `BarChartLabellises.vue:19`). Vue en fait un proxy réactif profond, ce que Chart.js supporte mal. La convention est `shallowRef`.

### Ce n'est pas un problème de données

Vérifié dans le CSV :

- **Audits prévus par mois** (fenêtre juillet 2026 → juin 2027) : **28 audits** tombent dans la fenêtre (16 en juillet, 4 en août, 5 en septembre, 3 en octobre).
- **Labellisés par année** (2022 et après) : les 852 `COMPLETED` ont tous une `DATE_DECISION` | 110 en 2022, 211 en 2023, 218 en 2024, 228 en 2025, 85 en 2026.

Les deux graphiques ont de quoi s'afficher.

---

## E. L'email d'activation de Sarah

**Cause : `NUXT_DEV_MODE=true` est actif en production.** Ce point est connu et sera corrigé séparément.

Conséquences, toutes vérifiées dans le code :

1. **Le mail est détourné.** `nuxt.config.ts:120` définit `devMailOverride: 'maxime@miloctav.fr'` **en dur dans le runtimeConfig**. `server/services/mail/index.ts:60-66` : si `devMode` est vrai, tout destinataire est remplacé par cette adresse. L'email d'activation de Sarah est parti chez Maxime.
2. **Le compte est créé actif avec un mot de passe en dur.** `server/api/accounts/index.post.ts:295-305` : en mode dev, `isActive: true` et `password: bcrypt('password')`.
3. **Le renvoi est impossible.** `server/api/accounts/[id]/resend-email.post.ts:83-88` refuse un compte déjà actif.

### Le process nominal (hors dev mode)

1. `POST /api/accounts` crée le compte `isActive: false`, sans mot de passe.
2. Génération d'un **JWT signé** (jose, HS256), payload `{ accountId, type: 'reset-password' }`, **valable 48 h** (`server/utils/jwt.ts:44-58`). Token *stateless* : rien n'est stocké en base, donc non révocable, et un changement de `NUXT_JWT_SECRET` invalide tous les liens en circulation.
3. Envoi via Resend du template `server/services/mail/templates/account-creation.ts`, avec un lien `/reset-password?token=…`.
4. L'utilisateur définit son mot de passe, `isActive` passe à `true`.

### Trois faiblesses à corriger même après le passage en `devMode: false`

- **Erreur d'envoi avalée** | `index.post.ts:361-365` se contente de logger et retourne quand même `201` avec `emailSent: false`. L'UI n'affiche jamais ce champ (`AccountsTable.vue:996`). L'admin ne sait jamais si le mail est parti.
- **Aucun bouton « renvoyer l'email »** | `grep -rn "resend-email" app/` ne retourne rien. L'endpoint existe, il n'est exposé nulle part. C'est la réponse directe au « quel est le process ? » d'Emmanuelle : aujourd'hui, elle n'a **aucun recours**.
- **Lien potentiellement invalide** | `server/utils/password-reset.ts:19` construit l'URL avec `getRequestURL(event).origin`. Derrière nginx, si `X-Forwarded-Proto` et `X-Forwarded-Host` ne sont pas propagés, le lien pointe sur `http://localhost:3000`.

À valider par ailleurs : le domaine expéditeur `noreply@notifications.monpmeplus.fr` est-il vérifié dans Resend (SPF/DKIM) ? Sinon les envois échouent ou partent en spam, et l'erreur est avalée par le point ci-dessus.

---

## F. Modification de rôle : jamais implémentée

Trois couches se cumulent. Le commit d'audit sécurité `fe4c1ac` n'y est pour rien : il n'a touché que `accounts/index.post.ts`.

1. **UI** | `AccountsTable.vue:171` : le `USelect` du rôle est `:disabled="!!forcedRole || isEditingMode"`. Il est grisé dès qu'on édite un compte existant.
2. **Handler** | `AccountsTable.vue:938-941` : l'update n'envoie que `firstname` et `lastname`.
3. **API** | `server/api/accounts/[id]/index.put.ts:6-10` : le body accepté ne contient que `firstname`, `lastname`, `emailNotificationsEnabled`. `role` est silencieusement ignoré (`:88`, `:103-105`). Même un `curl` forçant `role` renverrait `200` sans rien changer.

**Découverte plus grave** : `app/composables/useAccounts.ts:152-154` appelle `method: 'PATCH'` sur `/api/accounts/${id}`. Or le dossier `server/api/accounts/[id]/` ne contient que `index.put.ts` et `index.delete.ts`. **Aucune route `PATCH`.** Nitro renvoie donc un 405/404 : **l'édition d'un compte est probablement cassée en entier**, pas seulement le rôle. `app/pages/my-account.vue:129` et `:265` utilisent le même composable.

À reproduire pour confirmer.

Note : il n'existe aucun garde-fou interdisant l'auto-promotion, simplement parce que `role` n'est jamais traité. Le seul contrôle anti-escalade est à la création (`index.post.ts:48-53`, whitelist OE/AUDITOR pour un OE ADMIN | c'est l'apport de `fe4c1ac`).

---

## G. Tableau de bord : les chiffres ne peuvent pas coïncider

### Deux moteurs de comptage indépendants

| | `/api/audits/stats` (les cartes) | `/api/dashboard/overview` (le bandeau) |
|---|---|---|
| Granularité | **tous** les audits | **1 seul audit par entité** (le plus récent par `createdAt`) |
| `COMPLETED` | exclu (`stats.get.ts:22`) | inclus |
| `REFUSED_BY_OE` / `REFUSED_PLAN` | inclus | exclus (`overview.get.ts:149-150`) |
| `deletedAt` | **non filtré** | **non filtré** |

Une entité portant 5 audits historiques `SCHEDULED` pèse **5** dans la carte et **1** dans le bandeau. L'écart cartes/bandeau est **mathématiquement inévitable**. C'est le « 198 pas égal aux blocs au-dessus ».

### « État des dossiers : 257 »

`DashboardPage.vue:119-122` somme les 5 phases de `progressBarStats` (`overview.get.ts:361-401`). Ce total **additionne des objets de nature différente** :

- `candidature.total` = audits `PENDING_CASE_APPROVAL` + nombre de **contrats** `PENDING_ENTITY` + nombre d'**entités** ayant une action de dépôt en attente ;
- les 4 autres phases = comptage du **dernier audit par entité**.

Ce n'est donc **ni un nombre d'entités, ni un nombre d'audits**. Une même entité peut être comptée deux fois (action de dépôt pendante **et** dernier audit en `PLANNING`). Rien ne dédoublonne, et aucun filtre `deletedAt` n'est appliqué dans tout le fichier.

Emmanuelle a raison de ne pas comprendre : **ce chiffre ne veut rien dire de précis.**

### Bloc DECISION

- **Ordre des cartes** : codé en dur dans `useDashboardStats.ts:176-201`. Trivial à inverser pour mettre « plan d'action » au-dessus de « avis ».
- **Trou réel** : le statut `PENDING_CORRECTIVE_PLAN_VALIDATION` **n'a aucune carte**, alors qu'il est compté dans la phase « decision » du bandeau. Le total de la colonne est structurellement inférieur au bandeau.
- **Libellé trompeur** : « En attente attestation » compte en réalité `PENDING_FEEF_DECISION`.
- **Nemo Invest sans date** : la colonne affichée est `plannedDate` (`AuditsTable.vue:332-334`). Un audit importé avec `AUDIT_STATUT = 3-inspection finished - pool` et sans `PLANNED_DATE` arrive en base avec `plannedDate = NULL` (le `return` immédiat de `seed-audits.ts:41` court-circuite la logique de cohérence, et l'insert est conditionnel `:616`). L'information réelle serait `actualStartDate` / `actualEndDate`, **colonnes non affichées dans ce tableau**.

> **À trancher** : pour un audit en attente d'avis, la FEEF veut-elle voir la date de réalisation ou la date planifiée ? Cela détermine si on change la colonne ou si on répare la donnée.

### Bug transverse

`deletedAt` est filtré dans `/api/actions/stats` (via `server/utils/actionsQuery.ts:21,80,112,133`) mais **pas** dans `/api/audits/stats` ni dans `overview.get.ts`. Sur une même carte, le **compteur** inclut les audits supprimés et le **badge d'alerte** non. Les deux ne s'accorderont jamais.

---

## H. Entités : le compteur, les rattachements, l'export

### « Total entités labellisées = 324 »

Ce libellé **n'existe pas** dans l'application. Le KPI s'appelle « **Nombre d'entités** » (`DashboardPage.vue:259`). Emmanuelle l'a lu comme « labellisées ».

C'est un `COUNT(*)` brut sur la table `entities` (`overview.get.ts:165-171`), **sans filtre** :
- ni sur `deletedAt` (les entités supprimées sont comptées) ;
- ni sur `type` (les `GROUP` créés artificiellement par le seed sont comptés) ;
- ni sur `mode` (les `FOLLOWER` sont comptées) ;
- ni sur un quelconque statut de labellisation.

Le « delta avec le réel » est donc normal. À noter que le total affiché sous la **liste** des entités, lui, filtre bien `deletedAt` (`server/utils/pagination.ts:393-395`) : les deux chiffres peuvent légitimement diverger.

**Définition métier retenue** (validée le 08/07) :

> Une entité est **labellisée** si `mode = MASTER` **et** qu'elle possède **au moins un audit `COMPLETED`**.

« Au moins un », et non « le dernier » : une entité dont le dernier audit est un renouvellement en cours reste labellisée. La `feefDecision` n'est pas utilisable comme critère, elle n'est pas fiable sur les audits importés.

### Voir les rattachements sans faire du fiche à fiche

**Impossible aujourd'hui.** La liste (`EntitiesTable.vue:671-743`) affiche `name`, `siret`, `type`, `mode`, `oe`, `accountManager`, `audits`, `updatedAt`. Aucune colonne parent ni enfants.

Pourtant :
- l'API charge déjà `parentGroup: { id, name }` (`server/api/entities/index.get.ts:174-179`) et ne l'affiche jamais ;
- l'API supporte un filtre `parentGroupId`, y compris `=null` pour isoler les orphelines (`server/utils/pagination.ts:291-292`), non exposé dans l'UI.

Le seul écran listant des suiveuses est le panneau latéral de la fiche (`EntityCase.vue:666-728`) | et pour LSDH il n'affiche rien, cf. cause C.

### Export

Il existe, mais en **CSV uniquement** (`server/api/entities/export.get.ts`) : séparateur `;`, UTF-8 avec BOM, protection anti-injection de formules. Pas de XLSX.

Colonnes actuelles : Nom, SIRET, ID Ecocert, Tous les ID Ecocert, ID CRM, Type d'entité, Mode labellisation, **Groupe parent**, OE, Chargé de compte, Adresse, Complément, CP, Ville, Région, Téléphone, Date de première labellisation, Dernier audit, Date de création, Dernière mise à jour.

Il contient donc le **parent**, mais **pas les enfants**, et pas d'audit planifié.

> Il expose `crmId` et `ecocertId`, marqués « internal use only, not displayed in UI » dans le schéma (`server/database/schema.ts:150-154`).

### Les champs demandés pour Katrin

Ils existent tous, mais **pas dans la table `entities`**. Ils sont versionnés dans `entity_field_versions`, déclarés dans `server/database/entity-fields-config.ts` :

| Demande | Groupe | Clés |
|---|---|---|
| Type de produits | `products` (`:193`, `:297-301`) | `productsNature`, `productsBrands`, `productsFoodRatio`, `productsNonFoodRatio`, `productsRangeCount` |
| Autres certifications | `bio_activities` (`:220`, `:312-318`) | `bioLabelPresent`, `qseLabelPresent`, `rseLabelPresent`, `fairtradeLabelPresent`, … |
| Contacts | `pilot`, `ceo`, `accounting` (`:124-143`, `:247-265`) | `pilotLastName`, `pilotEmail`, `ceo*`, `accounting*` |

L'export ne charge qu'une seule `fieldKey` (`firstLabelingDate`, `export.get.ts:147`). Les ajouter demande de charger N clés et d'appliquer `getLatestFieldValueFromVersions` (`server/utils/entity-fields.ts:309+`).

### Colonnes « audit planifié » et « statut »

- **« Dernier audit »** existe, mais c'est un badge `statut - type` **sans date**, et le « dernier » est le plus récent par `createdAt`, pas par date d'audit réelle.
- **« audit planifié »** et **« statut »** n'existent pas. Il n'y a d'ailleurs **aucun champ `status` sur `entities`** : le seul statut est celui du dernier audit.
- **Tris** : l'API en supporte 8 (`name`, `type`, `mode`, `oe.name`, `accountManager.*`, `createdAt`, `updatedAt`). **L'UI n'en expose qu'un seul**, `updatedAt` (`EntitiesTable.vue:740`). Ajouter des colonnes triables est quasi gratuit côté serveur.
- **Recherche** : limitée à `name` et `siret` (`index.get.ts:70`). Pas de recherche sur ville, `ecocertId` ni `crmId`.

> **À trancher** : « statut » d'une entité, la FEEF entend quoi ? Le statut du dernier audit (déjà là, mal présenté), ou un statut de labellisation dérivé (labellisée / en cours / non labellisée) qui n'existe pas ?

### Bugs annexes

- `EntitiesTable.vue:726` lit `latestAudit.monitoringMode`, colonne **non sélectionnée** par l'API liste (`index.get.ts:183-188`). Le libellé du type d'audit est dégradé.
- `EntitiesTable.vue:643-644` : doublon `type: state.type` dans le payload de création.

---

## I. Espace entreprise (LSDH connectée en gestionnaire de dossier)

### Date de référence non modifiable

**C'est volontaire.** `server/database/entity-fields-config.ts:321` :

```ts
{ key: 'referenceDate', label: 'Date de référence', type: 'date', editableBy: ['FEEF'] }
```

Mais surtout : **elle est vide pour toutes les entités importées.** Elle n'est posée que par la state machine à la clôture d'un audit initial (`server/state-machine/actions.ts:73-79`). Les seeds ne la backfillent jamais : ils ne posent que `firstLabelingDate` (`seed-audits.ts:724-761`).

> **Conséquence sérieuse à ne pas rater** : `server/tasks/actions/check-anniversary.ts:97-101` skippe toute entité sans `referenceDate` (`reason: 'No referenceDate'`). **Les relances d'anniversaire ne partiront jamais** pour les entités importées.

Affichage : la carte est toujours rendue sur le tableau de bord (`EntityDashboard.vue:73-78`), mais dans l'onglet Dossier elle est conditionnée à `v-if="referenceDateValue"` (`EntityCase.vue:600`) | donc absente si vide.

### « Comment je peux rattacher des entreprises ? »

**Elle ne peut pas.**

- `PUT /api/entities/[id]/link` renvoie **403 si le rôle n'est pas FEEF** (`server/api/entities/[id]/link.put.ts:14-19`).
- Dans le modal, le sélecteur de mode est `v-if="isFEEF"` (`AddFollowerModal.vue:23`, `:189`). Un ENTITY n'a accès qu'au mode « créer une nouvelle suiveuse », jamais « rattacher une existante ».
- `POST /api/entities` autorise bien `FEEF` **et** `ENTITY` (`index.post.ts:37`), avec une limite de 10 (`:143-144`).

### « Dans mes audits il n'y a pas l'historique, ni celui en cours »

- **Pas d'historique** → cause A (filtre `inProgress`).
- **Ni celui en cours** → si la liste est **totalement vide**, c'est que `user.currentEntityId` n'est pas renseigné sur la session : `server/api/audits/index.get.ts:158-164` pousse alors `sql\`false\``. **À vérifier en base.**
- Autre piste : le SIRET de LSDH est stocké sur **13 caractères** (`8558149400029`) alors que `entites-all.csv` donne `08558149400029`.
- À noter : le filtre `entityId = currentEntityId` est strict. **Aucun audit des suiveuses n'apparaît** dans « Mes audits » du master.

### « Dans la frise étapes on n'a pas la liste des actions »

**Conforme au code.** `app/components/entity/AuditTimelineCard.vue:19-49` ne consomme que `props.audit.status`, mappé sur la constante statique `AuditStatusFlow` (`shared/types/enums.ts:278+`). **Aucun fetch, aucune référence à la table `actions`.**

Les actions sont servies par `GET /api/actions` et affichées via `ActionsSlideover.vue` / `actions/ActionsList.vue`, utilisés dans `NavBar.vue`, les layouts et `AuditPage.vue` | **jamais dans la frise**.

De plus, `seed-actions.ts` ne génère des actions **que pour les audits non terminaux** :

```js
const TERMINAL_STATUSES = ['COMPLETED', 'REFUSED_BY_OE', 'REFUSED_PLAN']
```

Donc **aucune action** pour les 8 audits `COMPLETED` de LSDH ni pour les 5 de Bouvard.

> **À confirmer** : `npm run db:seed-actions` a-t-il été lancé en production ? Il n'est chaîné ni à `db:seed`, ni à `db:seed-entities`, ni à `db:seed-audits`. Il doit être lancé explicitement, **en dernier**, et il purge la table `actions` (`await db.delete(actions)`).

### Frise limitée à un seul audit

`EntityDashboard.vue:7` prend `latestAudit = currentEntity.value?.audits?.[0]`, alimenté par `server/api/entities/[id]/index.get.ts:47-56` avec `orderBy: desc(audits.createdAt)` et **`limit: 1`**.

---

## J. Logo

Le logo actuel est `Logo-PMEplus.png`, présent en deux exemplaires (`app/assets/images/` et `public/`). Il s'affiche correctement dans les 4 layouts de dashboard.

**Deux points distincts :**

1. **Un nouveau logo a été envoyé et n'a pas encore été intégré.** C'est vraisemblablement l'objet de la demande d'Emmanuelle. À faire.
2. **Bug réel indépendant** : sur 4 pages d'authentification, le chemin utilisé est `/assets/images/Logo-PMEplus.png`, qui **n'existe pas côté serveur** (Nitro ne sert pas `app/assets/` sous `/assets`). Le logo est donc en **404** sur :
   - `app/pages/login.vue:74`
   - `app/pages/forgot-password.vue:56`
   - `app/pages/reset-password.vue:87`
   - `app/pages/verify-2fa.vue:149`

   Correction : utiliser `~/assets/images/…` comme les layouts, ou `/Logo-PMEplus.png`.

Il n'existe aucun composant `Logo.vue` : le `<img>` est répété en dur partout. À factoriser lors de l'intégration du nouveau logo.

---

## Besoin nouveau : permettre à la FEEF de corriger un audit

Exprimé le 08/07 : la FEEF doit pouvoir **modifier le statut d'un audit** et **renseigner ses dates importantes**, via un modal ou un slideover dédié.

C'est ce qui permettra de traiter les 3 audits fantômes de 2022 sans intervention en base.

Deux options, à arbitrer :

### Option 1 | Transition forcée

Un endpoint qui appelle `auditStateMachine.transition()` en **court-circuitant les guards** (`server/state-machine/config.ts`).

- **Pour** : reste dans le modèle existant ; les actions de sortie/entrée de statut continuent de s'exécuter (création des tâches utilisateur, génération d'attestation…).
- **Contre** : contourner les guards est précisément ce contre quoi la state machine protège. Risque d'amener un audit dans un état incohérent (statut `PENDING_OE_OPINION` sans rapport, par exemple). Déclenche des effets de bord potentiellement indésirables sur des données historiques (emails, notifications, attestations).

### Option 2 | Édition directe des champs, réservée à la FEEF

Un formulaire FEEF-only éditant `status`, `plannedDate`, `actualStartDate`, `actualEndDate`, `dateDecision`, sans passer par la state machine, avec journalisation dans la table `events`.

- **Pour** : correspond au besoin réel, qui est de **réparer des données d'import**, pas de faire avancer un workflow. Aucun effet de bord. Traçable.
- **Contre** : deux chemins d'écriture coexistent sur `audits.status`. Il faut garantir qu'aucune action ni notification n'est créée, et bien documenter que ce chemin est réservé à la correction.

**Recommandation** : option 2. Le besoin est de la réparation de données, pas de l'avancement de workflow. Mais l'arbitrage reste ouvert.

---

## Points à vérifier avant la prochaine session

1. Ouvrir la fiche **Maison Collet** avec `?status=COMPLETED` pour confirmer que son audit est bien en base (cause A et non import raté).
2. Reproduire l'**édition d'un compte** dans l'UI FEEF : le `PATCH` sans route correspondante casse-t-il l'update en entier ?
3. Vérifier que **`user.currentEntityId`** est bien renseigné pour le compte gestionnaire de LSDH.
4. Confirmer si **`db:seed-actions`** a été lancé en production.
5. Vérifier la propagation de **`X-Forwarded-Proto` / `X-Forwarded-Host`** dans la conf nginx (liens d'activation).
6. Vérifier que le domaine **`notifications.monpmeplus.fr`** est validé dans Resend (SPF/DKIM).
7. Signaler à Ecocert la divergence de SIRET sur **LAITERIE COLLET** (`40290959200022` dans les audits vs `40290959200025` dans le CRM) et la coquille probable sur **ROSTAIN** (`39977943800031` vs `59977943800031`).

---

## Décisions actées le 08/07/2026

| Sujet | Décision |
|---|---|
| LSDH `COMPANY` avec suiveuses | Incohérent. Passage en `GROUP` **à la main via l'UI**. Ne pas corriger le seed. |
| Définition de « labellisée » | `mode = MASTER` **et** au moins un audit `COMPLETED`. Pas de critère sur `feefDecision`. |
| 197 statuts Ecocert non reconnus | La FEEF tranche. Fournir l'outil de correction dans l'interface. |
| `NUXT_DEV_MODE=true` en prod | Cause connue du problème d'email. Corrigé plus tard, hors de ce lot. |
| Nouveau logo | Reçu, pas encore intégré. À faire. |
