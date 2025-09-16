<template>
  <div class="grid grid-cols-3 gap-6">
    <InfoCard
      icon="i-lucide-factory"
      :title="'Production'"
      cardClass="space-y-4"
      iconClass="w-5 h-5 text-blue-600"
    >
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Production propre</span>
          <UBadge :color="activites.productionPropre ? 'success' : 'neutral'" variant="soft">
            {{ activites.productionPropre ? 'Oui' : 'Non' }}
          </UBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Production sous-traitance</span>
          <UBadge :color="activites.productionSousTraitance ? 'success' : 'neutral'" variant="soft">
            {{ activites.productionSousTraitance ? 'Oui' : 'Non' }}
          </UBadge>
        </div>
      </div>
    </InfoCard>
    <InfoCard
      icon="i-lucide-package"
      :title="'Conditionnement'"
      cardClass="space-y-4"
      iconClass="w-5 h-5 text-blue-600"
    >
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Conditionnement propre</span>
          <UBadge :color="activites.conditionnementPropre ? 'success' : 'neutral'" variant="soft">
            {{ activites.conditionnementPropre ? 'Oui' : 'Non' }}
          </UBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Conditionnement sous-traitance</span>
          <UBadge :color="activites.conditionnementSousTraitance ? 'success' : 'neutral'" variant="soft">
            {{ activites.conditionnementSousTraitance ? 'Oui' : 'Non' }}
          </UBadge>
        </div>
      </div>
    </InfoCard>
    <InfoCard
      icon="i-lucide-truck"
      :title="'Logistique'"
      cardClass="space-y-4"
      iconClass="w-5 h-5 text-blue-600"
    >
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Logistique propre</span>
          <UBadge :color="activites.logistiquePropre ? 'success' : 'neutral'" variant="soft">
            {{ activites.logistiquePropre ? 'Oui' : 'Non' }}
          </UBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Logistique sous-traitance</span>
          <UBadge :color="activites.logistiqueSousTraitance ? 'success' : 'neutral'" variant="soft">
            {{ activites.logistiqueSousTraitance ? 'Oui' : 'Non' }}
          </UBadge>
        </div>
      </div>
    </InfoCard>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activites: {
    productionPropre: boolean
    productionSousTraitance: boolean
    conditionnementPropre: boolean
    conditionnementSousTraitance: boolean
    logistiquePropre: boolean
    logistiqueSousTraitance: boolean
  }
}
const props = defineProps<Props>()
</script>
