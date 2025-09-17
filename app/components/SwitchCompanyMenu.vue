<script setup lang="ts">
import { ref, computed } from 'vue'
import { COMPANIES } from '../utils/data'
import type { Company } from '../utils/data'

defineProps<{ collapsed?: boolean }>()

const companies = ref(COMPANIES.map((company: Company) => ({
  id: company.id,
  label: company.raisonSociale.nom,
  avatar: {
    src: `https://ui-avatars.com/api/?name=${encodeURIComponent(company.raisonSociale.nom)}&background=random`,
    alt: company.raisonSociale.nom
  }
})))

const selectedCompany = ref(companies.value[0])

// Émet l'id de l'entreprise sélectionnée à chaque changement
const emit = defineEmits<{ (e: 'update:id', id: string): void }>()

watch(selectedCompany, (val) => {
  emit('update:id', val.id)
})

const items = computed(() => [
  companies.value.map((company: { id: string; label: string; avatar: { src: string; alt: string } }) => ({
    ...company,
    onSelect() {
      selectedCompany.value = company
      emit('update:id', company.id)
    }
  }))
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedCompany,
        label: collapsed ? undefined : selectedCompany?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
  class="data-[state=open]:bg-elevated bg-gray-100 border border-gray-300"
  :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>