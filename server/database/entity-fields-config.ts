/**
 * Configuration des champs versionnés des entités
 *
 * Ces champs évoluent dans le temps et sont stockés avec versioning complet
 * dans la table entity_field_versions
 */

// Types de champs supportés
export type EntityFieldType = 'string' | 'number' | 'boolean' | 'date' | 'text'

// Clés des champs (à étendre au besoin)
export type EntityFieldKey =
  | 'sitesCount'
  | 'sitesRevenue'
  | 'revenueAmount'
  | 'revenueYear'
  | 'pilotLastName'
  | 'pilotFirstName'
  | 'pilotRole'
  | 'pilotPhone'
  | 'pilotEmail'
  | 'ceoLastName'
  | 'ceoFirstName'
  | 'ceoRole'
  | 'ceoPhone'
  | 'ceoEmail'
  | 'accountingLastName'
  | 'accountingFirstName'
  | 'accountingRole'
  | 'accountingPhone'
  | 'accountingEmail'
  | 'labelingScopeDescription'
  | 'labelingScopeExcludeActivities'
  | 'labelingScopeExcludeReason'
  | 'labelingScopeExcludeYesno'
  | 'labelingScopeRequestedScope'
  | 'activitiesDescription'
  | 'activitiesProductionInhouse'
  | 'activitiesProductionSubcontracted'
  | 'activitiesPackagingInhouse'
  | 'activitiesPackagingSubcontracted'
  | 'activitiesLogisticsInhouse'
  | 'activitiesLogisticsSubcontracted'
  | 'subcontractingNature'
  | 'subcontractingTotalRatio'
  | 'subcontractingFranceRatio'
  | 'subcontractingEuropeRatio'
  | 'subcontractingNonEuropeRatio'
  | 'tradingNature'
  | 'tradingTotalRatio'
  | 'tradingFranceRatio'
  | 'tradingEuropeRatio'
  | 'tradingNonEuropeRatio'
  | 'productsFoodRatio'
  | 'productsNonFoodRatio'
  | 'productsRangeCount'
  | 'productsBrands'
  | 'productsNature'
  | 'employeesHeadcountHq'
  | 'employeesAdminCount'
  | 'employeesProductionCount'
  | 'employeesTotalScopeCount'
  | 'employeesCsePresent'
  | 'employeesRseResources'
  | 'bioLabelPresent'
  | 'qseLabelPresent'
  | 'qseLabelOther'
  | 'rseLabelPresent'
  | 'rseLabelOther'
  | 'fairtradeLabelPresent'
  | 'fairtradeLabelOther'

// Clés des groupes de champs
export type EntityFieldGroupKey =
  | 'sites'
  | 'revenue'
  | 'pilot'
  | 'ceo'
  | 'accounting'
  | 'labeling_scope'
  | 'activities'
  | 'subcontracting'
  | 'trading'
  | 'products'
  | 'employees'
  | 'bio_activities'

// Définition d'un groupe de champs
export interface EntityFieldGroup {
  key: EntityFieldGroupKey
  label: string
  description: string
  icon: string  // Nom d'icône Lucide
  fields: EntityFieldKey[]  // Liste des champs appartenant au groupe
}

// Définition d'un champ
export interface EntityFieldDefinition {
  key: EntityFieldKey
  label: string
  type: EntityFieldType
  required: boolean
  description?: string
  unit?: string // Ex: "€", "jours", "%"
  group: EntityFieldGroupKey  // Groupe auquel appartient ce champ
}

// Configuration des groupes de champs
export const entityFieldGroups: EntityFieldGroup[] = [
  {
    key: 'sites',
    label: 'Sites',
    description: 'Informations sur les sites',
    icon: 'i-lucide-building',
    fields: ['sitesCount', 'sitesRevenue'],
  },
  {
    key: 'revenue',
    label: 'Chiffre d\'affaires',
    description: 'Informations sur le chiffre d\'affaires',
    icon: 'i-lucide-euro',
    fields: ['revenueAmount', 'revenueYear'],
  },
  {
    key: 'pilot',
    label: 'Pilote de la démarche',
    description: 'Contact pilote de la démarche',
    icon: 'i-lucide-user',
    fields: ['pilotLastName', 'pilotFirstName', 'pilotRole', 'pilotPhone', 'pilotEmail'],
  },
  {
    key: 'ceo',
    label: 'Dirigeant de l\'entreprise',
    description: 'Informations sur le dirigeant',
    icon: 'i-lucide-user-check',
    fields: ['ceoLastName', 'ceoFirstName', 'ceoRole', 'ceoPhone', 'ceoEmail'],
  },
  {
    key: 'accounting',
    label: 'Informations comptables',
    description: 'Contact comptabilité',
    icon: 'i-lucide-calculator',
    fields: ['accountingLastName', 'accountingFirstName', 'accountingRole', 'accountingPhone', 'accountingEmail'],
  },
  {
    key: 'labeling_scope',
    label: 'Périmètre de labellisation',
    description: 'Informations sur le périmètre de labellisation',
    icon: 'i-lucide-flag',
    fields: ['labelingScopeRequestedScope', 'labelingScopeExcludeYesno', 'labelingScopeExcludeActivities', 'labelingScopeExcludeReason'],
  },
  {
    key: 'activities',
    label: 'Activités de l\'entreprise',
    description: 'Description des activités',
    icon: 'i-lucide-activity',
    fields: [
      'activitiesDescription',
      'activitiesProductionInhouse',
      'activitiesProductionSubcontracted',
      'activitiesPackagingInhouse',
      'activitiesPackagingSubcontracted',
      'activitiesLogisticsInhouse',
      'activitiesLogisticsSubcontracted',
    ],
  },
  {
    key: 'subcontracting',
    label: 'Sous-traitance',
    description: 'Informations sur la sous-traitance',
    icon: 'i-lucide-handshake',
    fields: [
      'subcontractingNature',
      'subcontractingTotalRatio',
      'subcontractingFranceRatio',
      'subcontractingEuropeRatio',
      'subcontractingNonEuropeRatio',
    ],
  },
  {
    key: 'trading',
    label: 'Négoce',
    description: 'Informations sur la partie négoce',
    icon: 'i-lucide-shopping-cart',
    fields: [
      'tradingNature',
      'tradingTotalRatio',
      'tradingFranceRatio',
      'tradingEuropeRatio',
      'tradingNonEuropeRatio',
    ],
  },
  {
    key: 'products',
    label: 'Produits',
    description: 'Informations sur les produits',
    icon: 'i-lucide-package',
    fields: [
      'productsFoodRatio',
      'productsNonFoodRatio',
      'productsRangeCount',
      'productsBrands',
      'productsNature',
    ],
  },
  {
    key: 'employees',
    label: 'Salariés',
    description: 'Informations sur les salariés',
    icon: 'i-lucide-users',
    fields: [
      'employeesHeadcountHq',
      'employeesAdminCount',
      'employeesProductionCount',
      'employeesTotalScopeCount',
      'employeesCsePresent',
      'employeesRseResources',
    ],
  },
  {
    key: 'bio_activities',
    label: 'Activités biologiques et labellisations',
    description: 'Labellisations et certifications',
    icon: 'i-lucide-leaf',
    fields: [
      'bioLabelPresent',
      'qseLabelPresent',
      'qseLabelOther',
      'rseLabelPresent',
      'rseLabelOther',
      'fairtradeLabelPresent',
      'fairtradeLabelOther',
    ],
  },
]

// Configuration complète des champs d'entité
export const entityFieldsConfig: EntityFieldDefinition[] = [
  // Sites
  { key: 'sitesCount', label: 'Nombre de site', type: 'number', required: true, group: 'sites' },
  { key: 'sitesRevenue', label: 'Chiffres', type: 'number', required: false, group: 'sites' },

  // Chiffre d'affaires
  { key: 'revenueAmount', label: 'CA', type: 'number', required: true, group: 'revenue', unit: '€' },
  { key: 'revenueYear', label: 'Année du CA', type: 'number', required: true, group: 'revenue' },

  // Pilote de la démarche
  { key: 'pilotLastName', label: 'Contact pilote : nom', type: 'string', required: true, group: 'pilot' },
  { key: 'pilotFirstName', label: 'Contact pilote : prénom', type: 'string', required: true, group: 'pilot' },
  { key: 'pilotRole', label: 'Fonction pilote', type: 'string', required: false, group: 'pilot' },
  { key: 'pilotPhone', label: 'Numéro de portable (tel fixe à défaut)', type: 'string', required: false, group: 'pilot' },
  { key: 'pilotEmail', label: 'Email contact pilote', type: 'string', required: false, group: 'pilot' },

  // Dirigeant de l'entreprise
  { key: 'ceoLastName', label: 'Dirigeant : nom', type: 'string', required: true, group: 'ceo' },
  { key: 'ceoFirstName', label: 'Dirigeant : prénom', type: 'string', required: true, group: 'ceo' },
  { key: 'ceoRole', label: 'Fonction dirigeant', type: 'string', required: false, group: 'ceo' },
  { key: 'ceoPhone', label: 'Numéro de portable (tel fixe à défaut)', type: 'string', required: false, group: 'ceo' },
  { key: 'ceoEmail', label: 'Email contact dirigeant', type: 'string', required: false, group: 'ceo' },

  // Informations comptables
  { key: 'accountingLastName', label: 'Comptabilité : nom', type: 'string', required: false, group: 'accounting' },
  { key: 'accountingFirstName', label: 'Comptabilité : prénom', type: 'string', required: false, group: 'accounting' },
  { key: 'accountingRole', label: 'Fonction comptabilité', type: 'string', required: false, group: 'accounting' },
  { key: 'accountingPhone', label: 'Numéro de téléphone', type: 'string', required: false, group: 'accounting' },
  { key: 'accountingEmail', label: 'Email contact comptabilité', type: 'string', required: false, group: 'accounting' },

  // Périmètre de labellisation
  { key: 'labelingScopeRequestedScope', label: 'Quel est le périmètre souhaité ?', type: 'text', required: true, group: 'labeling_scope' },
  { key: 'labelingScopeExcludeYesno', label: 'Souhaitez-vous exclure une partie des activités de l\'entreprise ?', type: 'boolean', required: false, group: 'labeling_scope' },
  { key: 'labelingScopeExcludeActivities', label: 'Si oui, lesquelles', type: 'text', required: false, group: 'labeling_scope' },
  { key: 'labelingScopeExcludeReason', label: 'Pour quelle raison', type: 'text', required: false, group: 'labeling_scope' },

  // Activités de l'entreprise
  { key: 'activitiesDescription', label: 'Descriptif de l\'activité de l\'entreprise', type: 'text', required: true, group: 'activities' },
  { key: 'activitiesProductionInhouse', label: 'Activité de production dans l\'entreprise, en propre', type: 'boolean', required: false, group: 'activities' },
  { key: 'activitiesProductionSubcontracted', label: 'Activité de production dans l\'entreprise, sous-traitance', type: 'boolean', required: false, group: 'activities' },
  { key: 'activitiesPackagingInhouse', label: 'Activité de conditionnement dans l\'entreprise, en propre', type: 'boolean', required: false, group: 'activities' },
  { key: 'activitiesPackagingSubcontracted', label: 'Activité de conditionnement dans l\'entreprise, sous-traitance', type: 'boolean', required: false, group: 'activities' },
  { key: 'activitiesLogisticsInhouse', label: 'Activité logistique dans l\'entreprise, en propre', type: 'boolean', required: false, group: 'activities' },
  { key: 'activitiesLogisticsSubcontracted', label: 'Activité logistique dans l\'entreprise, en sous-traitance', type: 'boolean', required: false, group: 'activities' },

  // Sous-traitance
  { key: 'subcontractingNature', label: 'Expliciter la nature de la sous-traitance au sein de vos activités', type: 'text', required: false, group: 'subcontracting' },
  { key: 'subcontractingTotalRatio', label: 'Part du CA en sous-traitance totale', type: 'number', required: false, group: 'subcontracting', unit: '%' },
  { key: 'subcontractingFranceRatio', label: 'Part du CA en sous-traitance France', type: 'number', required: false, group: 'subcontracting', unit: '%' },
  { key: 'subcontractingEuropeRatio', label: 'Part du CA en sous-traitance Europe', type: 'number', required: false, group: 'subcontracting', unit: '%' },
  { key: 'subcontractingNonEuropeRatio', label: 'Part du CA en sous-traitance Hors-Europe', type: 'number', required: false, group: 'subcontracting', unit: '%' },

  // Négoce
  { key: 'tradingNature', label: 'Expliciter la nature de la partie en négoce au sein de vos activités', type: 'text', required: false, group: 'trading' },
  { key: 'tradingTotalRatio', label: 'Part du CA de la négoce totale', type: 'number', required: false, group: 'trading', unit: '%' },
  { key: 'tradingFranceRatio', label: 'Part du CA de la négoce France', type: 'number', required: false, group: 'trading', unit: '%' },
  { key: 'tradingEuropeRatio', label: 'Part du CA de la négoce Europe', type: 'number', required: false, group: 'trading', unit: '%' },
  { key: 'tradingNonEuropeRatio', label: 'Part du CA de la négoce Hors-Europe', type: 'number', required: false, group: 'trading', unit: '%' },

  // Produits
  { key: 'productsFoodRatio', label: 'Part en volume des produits alimentaires ?', type: 'number', required: false, group: 'products', unit: '%' },
  { key: 'productsNonFoodRatio', label: 'Par en volume des produits non-alimentaires ?', type: 'number', required: false, group: 'products', unit: '%' },
  { key: 'productsNature', label: 'Quelle(s) est(sont) la nature de vos produits ?', type: 'text', required: false, group: 'products' },
  { key: 'productsRangeCount', label: 'Combien de gamme proposez-vous ?', type: 'number', required: false, group: 'products' },
  { key: 'productsBrands', label: 'Sous quelle(s) marque(s) est (sont) commercialisée(s) vos produits (dans le périmètre de labellisation) ?', type: 'text', required: false, group: 'products' },

  // Salariés
  { key: 'employeesHeadcountHq', label: 'Quel est le nombre de salariés au siège ?', type: 'number', required: false, group: 'employees' },
  { key: 'employeesAdminCount', label: 'Dont personnel administratif', type: 'number', required: false, group: 'employees' },
  { key: 'employeesProductionCount', label: 'Dont personnel de production', type: 'number', required: false, group: 'employees' },
  { key: 'employeesTotalScopeCount', label: 'Nombre total de salariés de l\'ensemble du périmètre souhaité', type: 'number', required: false, group: 'employees' },
  { key: 'employeesCsePresent', label: 'Présence d\'un CSE', type: 'boolean', required: false, group: 'employees' },
  { key: 'employeesRseResources', label: 'Ressources allouées à la RSE (equivalent homme/an)', type: 'number', required: false, group: 'employees' },

  // Activités biologiques et labellisations
  { key: 'bioLabelPresent', label: 'Labellisation biologique', type: 'boolean', required: false, group: 'bio_activities' },
  { key: 'qseLabelPresent', label: 'Labellisation QSE en place', type: 'string', required: false, group: 'bio_activities' },
  { key: 'qseLabelOther', label: 'Autre labellisation QSE', type: 'text', required: false, group: 'bio_activities' },
  { key: 'rseLabelPresent', label: 'Labellisation RSE en place', type: 'string', required: false, group: 'bio_activities' },
  { key: 'rseLabelOther', label: 'Autre labellisation RSE', type: 'text', required: false, group: 'bio_activities' },
  { key: 'fairtradeLabelPresent', label: 'Labellisation équitable en place', type: 'string', required: false, group: 'bio_activities' },
  { key: 'fairtradeLabelOther', label: 'Autre labellisation équitable', type: 'text', required: false, group: 'bio_activities' },
]

// Helper pour récupérer la définition d'un champ
export function getFieldDefinition(key: EntityFieldKey): EntityFieldDefinition | undefined {
  return entityFieldsConfig.find(field => field.key === key)
}

// Helper pour valider qu'une clé existe
export function isValidFieldKey(key: string): key is EntityFieldKey {
  return entityFieldsConfig.some(field => field.key === key)
}

// Helper pour récupérer les champs requis
export function getRequiredFields(): EntityFieldDefinition[] {
  return entityFieldsConfig.filter(field => field.required)
}

// Helper pour récupérer les champs par type
export function getFieldsByType(type: EntityFieldType): EntityFieldDefinition[] {
  return entityFieldsConfig.filter(field => field.type === type)
}

// Helper pour récupérer un groupe de champs
export function getFieldGroup(groupKey: EntityFieldGroupKey): EntityFieldGroup | undefined {
  return entityFieldGroups.find(g => g.key === groupKey)
}

// Helper pour récupérer les champs d'un groupe
export function getFieldsByGroup(groupKey: EntityFieldGroupKey): EntityFieldDefinition[] {
  return entityFieldsConfig.filter(field => field.group === groupKey)
}

// Helper pour récupérer le groupe d'un champ
export function getGroupForField(fieldKey: EntityFieldKey): EntityFieldGroupKey | undefined {
  return entityFieldsConfig.find(f => f.key === fieldKey)?.group
}

// Helper pour récupérer tous les groupes
export function getAllFieldGroups(): EntityFieldGroup[] {
  return entityFieldGroups
}
