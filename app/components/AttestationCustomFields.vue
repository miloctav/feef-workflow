<template>
  <div class="space-y-4 w-full">
    <UFormField label="Périmètre de labellisation" class="w-full">
      <UTextarea
        v-model="localScope"
        :rows="3"
        placeholder="Décrivez le périmètre de labellisation"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="hasExclusions"
      label="Activités exclues du périmètre"
      class="w-full"
    >
      <UTextarea
        v-model="localExclusions"
        :rows="2"
        placeholder="Listez les activités exclues"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="isGroup"
      label="Entreprises du groupe"
      class="w-full"
    >
      <UTextarea
        v-model="localCompanies"
        :rows="2"
        :placeholder="`Exemple: ${companiesPlaceholder}`"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import type { AuditWithRelations } from '~~/app/types/audits'

interface Props {
  audit: AuditWithRelations
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:scope': [value: string]
  'update:exclusions': [value: string]
  'update:companies': [value: string]
}>()

const localScope = ref('')
const localExclusions = ref('')
const localCompanies = ref('')

const entity = computed(() => props.audit.entity)
const isGroup = computed(() => entity.value?.type === 'GROUP')

const hasExclusions = computed(() => {
  const field = entity.value?.fields?.find((f) => f.key === 'labelingScopeExcludeYesno')
  return field?.value === true
})

const companiesPlaceholder = computed(() => {
  if (!isGroup.value || !entity.value?.childEntities) return ''
  return entity.value.childEntities
    .slice(0, 2)
    .map((e) => e.name)
    .join(', ')
})

// Pré-remplir depuis attestationMetadata (si existe) ou depuis les champs de l'entité
onMounted(() => {
  const metadata = props.audit.attestationMetadata

  // Périmètre : priorité à attestationMetadata, sinon champ de l'entité
  if (metadata && typeof metadata === 'object' && 'customScope' in metadata) {
    localScope.value = metadata.customScope || ''
  } else {
    const scopeField = entity.value?.fields?.find((f) => f.key === 'labelingScopeRequestedScope')
    localScope.value = scopeField?.value || ''
  }

  // Exclusions : priorité à attestationMetadata, sinon champ de l'entité
  if (metadata && typeof metadata === 'object' && 'customExclusions' in metadata) {
    localExclusions.value = metadata.customExclusions || ''
  } else {
    const exclusionsField = entity.value?.fields?.find(
      (f) => f.key === 'labelingScopeExcludeActivities'
    )
    localExclusions.value = exclusionsField?.value || ''
  }

  // Entreprises : priorité à attestationMetadata, sinon childEntities
  if (metadata && typeof metadata === 'object' && 'customCompanies' in metadata) {
    localCompanies.value = metadata.customCompanies || ''
  } else if (isGroup.value && entity.value?.childEntities) {
    localCompanies.value = entity.value.childEntities.map((e) => e.name).join(', ')
  }
})

// Émettre les changements
watch(
  [localScope, localExclusions, localCompanies],
  () => {
    emit('update:scope', localScope.value)
    emit('update:exclusions', localExclusions.value)
    emit('update:companies', localCompanies.value)
  },
  { immediate: true }
)
</script>
