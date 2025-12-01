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
  | 'labeling_scope'
  | 'employee_count'
  | 'subcontracting_ratio'
  | 'production_sites_count'
  | 'annual_revenue'
  | 'certification_date'
  | 'contract_duration'
  | 'quality_manager'
  | 'main_activity'
  | 'has_quality_system'

// Clés des groupes de champs
export type EntityFieldGroupKey = 'employee_info' | 'general_info' | 'production_info'

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
    key: 'employee_info',
    label: 'Salarié',
    description: 'Informations relatives aux employés',
    icon: 'i-lucide-users',
    fields: ['employee_count', 'quality_manager'],
  },
  {
    key: 'general_info',
    label: 'Informations générales',
    description: 'Informations générales sur l\'entité',
    icon: 'i-lucide-building-2',
    fields: [
      'main_activity',
      'labeling_scope',
      'certification_date',
      'contract_duration',
      'has_quality_system',
    ],
  },
  {
    key: 'production_info',
    label: 'Production',
    description: 'Informations de production',
    icon: 'i-lucide-factory',
    fields: [
      'production_sites_count',
      'subcontracting_ratio',
      'annual_revenue',
    ],
  },
]

// Configuration complète des champs d'entité
export const entityFieldsConfig: EntityFieldDefinition[] = [
  // Groupe: Salarié
  {
    key: 'employee_count',
    label: 'Nombre de salariés',
    type: 'number',
    required: true,
    description: 'Effectif total de l\'entité',
    group: 'employee_info',
  },
  {
    key: 'quality_manager',
    label: 'Responsable qualité',
    type: 'string',
    required: false,
    description: 'Nom du responsable qualité de l\'entité',
    group: 'employee_info',
  },

  // Groupe: Informations générales
  {
    key: 'main_activity',
    label: 'Activité principale',
    type: 'string',
    required: true,
    description: 'Description de l\'activité principale de l\'entité',
    group: 'general_info',
  },
  {
    key: 'labeling_scope',
    label: 'Périmètre de labellisation',
    type: 'text',
    required: true,
    description: 'Description détaillée du périmètre couvert par la certification FEEF',
    group: 'general_info',
  },
  {
    key: 'certification_date',
    label: 'Date de certification',
    type: 'date',
    required: false,
    description: 'Date d\'obtention de la certification FEEF',
    group: 'general_info',
  },
  {
    key: 'contract_duration',
    label: 'Durée du contrat',
    type: 'number',
    required: false,
    description: 'Durée du contrat de certification',
    unit: 'mois',
    group: 'general_info',
  },
  {
    key: 'has_quality_system',
    label: 'Système qualité en place',
    type: 'boolean',
    required: false,
    description: 'L\'entité dispose-t-elle d\'un système qualité formalisé?',
    group: 'general_info',
  },

  // Groupe: Production
  {
    key: 'production_sites_count',
    label: 'Nombre de sites de production',
    type: 'number',
    required: false,
    description: 'Nombre de sites de production actifs',
    group: 'production_info',
  },
  {
    key: 'subcontracting_ratio',
    label: 'Répartition de la sous-traitance',
    type: 'number',
    required: false,
    description: 'Pourcentage de sous-traitance dans l\'activité',
    unit: '%',
    group: 'production_info',
  },
  {
    key: 'annual_revenue',
    label: 'Chiffre d\'affaires annuel',
    type: 'number',
    required: false,
    description: 'Chiffre d\'affaires annuel de l\'entité',
    unit: '€',
    group: 'production_info',
  },
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
