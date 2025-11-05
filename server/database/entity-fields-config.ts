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

// Définition d'un champ
export interface EntityFieldDefinition {
  key: EntityFieldKey
  label: string
  type: EntityFieldType
  required: boolean
  description?: string
  unit?: string // Ex: "€", "jours", "%"
}

// Configuration complète des champs d'entité
export const entityFieldsConfig: EntityFieldDefinition[] = [
  {
    key: 'labeling_scope',
    label: 'Périmètre de labellisation',
    type: 'text',
    required: true,
    description: 'Description détaillée du périmètre couvert par la certification FEEF',
  },
  {
    key: 'employee_count',
    label: 'Nombre de salariés',
    type: 'number',
    required: true,
    description: 'Effectif total de l\'entité',
  },
  {
    key: 'subcontracting_ratio',
    label: 'Répartition de la sous-traitance',
    type: 'number',
    required: false,
    description: 'Pourcentage de sous-traitance dans l\'activité',
    unit: '%',
  },
  {
    key: 'production_sites_count',
    label: 'Nombre de sites de production',
    type: 'number',
    required: false,
    description: 'Nombre de sites de production actifs',
  },
  {
    key: 'annual_revenue',
    label: 'Chiffre d\'affaires annuel',
    type: 'number',
    required: false,
    description: 'Chiffre d\'affaires annuel de l\'entité',
    unit: '€',
  },
  {
    key: 'certification_date',
    label: 'Date de certification',
    type: 'date',
    required: false,
    description: 'Date d\'obtention de la certification FEEF',
  },
  {
    key: 'contract_duration',
    label: 'Durée du contrat',
    type: 'number',
    required: false,
    description: 'Durée du contrat de certification',
    unit: 'mois',
  },
  {
    key: 'quality_manager',
    label: 'Responsable qualité',
    type: 'string',
    required: false,
    description: 'Nom du responsable qualité de l\'entité',
  },
  {
    key: 'main_activity',
    label: 'Activité principale',
    type: 'string',
    required: true,
    description: 'Description de l\'activité principale de l\'entité',
  },
  {
    key: 'has_quality_system',
    label: 'Système qualité en place',
    type: 'boolean',
    required: false,
    description: 'L\'entité dispose-t-elle d\'un système qualité formalisé?',
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
