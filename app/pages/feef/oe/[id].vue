<script setup lang="ts">
import { h, resolveComponent } from "vue";
import { ORGANISMES_EVALUATEURS, type OE, type Account } from "~/utils/data";
import OeAccountTable from '~/components/OeAccountTable.vue';

definePageMeta({
  layout: "dashboard-feef",
});

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UDropdownMenu = resolveComponent('UDropdownMenu');

const route = useRoute();
const oeId = computed(() => route.params.id as string);

// Trouver l'OE correspondant
const oe = computed(() => {
  return ORGANISMES_EVALUATEURS.find(o => o.id === oeId.value);
});

</script>

<template>
  <UDashboardPanel id="oe">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <div v-if="!oe" class="flex items-center justify-center h-64">
        <div class="text-center">
          <h2 class="text-xl text-gray-600">Organisme évaluateur non trouvé</h2>
          <UButton 
            to="/feef/oe" 
            variant="ghost" 
            class="mt-4"
          >
            Retour à la liste
          </UButton>
        </div>
      </div>
      
      <div v-else class="w-full space-y-6 pb-4">
        <!-- Nom de l'OE en gros titre -->
        <div class="border-b border-gray-200 pb-4">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ oe.nom }}
          </h1>
          <p class="text-gray-600 dark:text-gray-300 mt-2">
            {{ oe.accounts.length }} compte{{ oe.accounts.length > 1 ? 's' : '' }} utilisateur{{ oe.accounts.length > 1 ? 's' : '' }}
          </p>
        </div>

          <OeAccountTable />
      </div>
    </template>
  </UDashboardPanel>
</template>
