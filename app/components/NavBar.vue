<script setup lang="ts">
import { Role } from '#shared/types/roles'

// Interface pour les éléments du breadcrumb
interface BreadcrumbItem {
  label: string
  icon?: string
  to?: string
}

interface Props {
  breadcrumbItems?: BreadcrumbItem[]
}

const props = withDefaults(defineProps<Props>(), {
  breadcrumbItems: () => []
})

const { isNotificationsSlideoverOpen, isActionsSlideoverOpen } = useDashboard()

// Récupérer la session pour vérifier le rôle
const { data: session } = await useFetch('/api/auth/session')

// Utiliser le composable pour générer les breadcrumbs intelligents
const { breadcrumbItems: generatedBreadcrumbs } = useBreadcrumb()

// Prioriser les breadcrumbs passés en props, sinon utiliser ceux générés
const displayedBreadcrumbs = computed(() => {
  return props.breadcrumbItems.length > 0 ? props.breadcrumbItems : generatedBreadcrumbs.value
})
</script>

<template>
  <UDashboardNavbar>
    <template #leading>
      <UDashboardSidebarCollapse />
      <UBreadcrumb
        :items="displayedBreadcrumbs"
        separator-icon="i-heroicons-chevron-right"
        class="ml-4"
      />
    </template>

     <template #right>
          <UTooltip text="Mes actions" :shortcuts="['T']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isActionsSlideoverOpen = true"
            >
              <UChip color="primary" inset>
                <UIcon name="i-lucide-clipboard-list" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>
        </template>

    <template #trailing>
      <slot name="actions" />
    </template>
  </UDashboardNavbar>
</template>