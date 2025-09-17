<script setup lang="ts">
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

// Génération automatique du breadcrumb basé sur la route si pas d'items fournis
const route = useRoute()

const { isNotificationsSlideoverOpen } = useDashboard()

const defaultBreadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (props.breadcrumbItems.length > 0) {
    return props.breadcrumbItems
  }

  const pathSegments = route.path.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []

  // Construction du breadcrumb basé sur les segments de l'URL (en excluant 'feef')
  let currentPath = ''
  
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    currentPath += `/${segment}`
    
    // Mappage des segments vers des labels lisibles
    let label = segment
    let icon = ''
    
    switch (segment) {
      case 'feef':
        // Ignorer le segment 'feef'
        continue
      case 'companies':
        label = 'Entreprises'
        icon = 'i-heroicons-building-storefront'
        break
      case 'labeling-cases':
        label = 'Dossiers de Labellisation'
        icon = 'i-heroicons-folder'
        break
      case 'oe':
        continue
      case 'settings':
        label = 'Paramètres'
        icon = 'i-heroicons-cog-6-tooth'
        break
      default:
        // Pour les IDs numériques, essayer de récupérer un nom plus parlant
        if (segment && /^\d+$/.test(segment)) {
          label = `#${segment}`
          icon = 'i-heroicons-hashtag'
        } else if (segment) {
          label = segment.charAt(0).toUpperCase() + segment.slice(1)
        }
    }

    items.push({
      label: label || segment || 'Page',
      icon,
      to: i === pathSegments.length - 1 ? undefined : currentPath // Pas de lien pour le dernier élément (page actuelle)
    })
  }

  return items
})
</script>

<template>
  <UDashboardNavbar>
    <template #leading>
      <UDashboardSidebarCollapse />
      <UBreadcrumb 
        :items="defaultBreadcrumbItems" 
        separator-icon="i-heroicons-chevron-right"
        class="ml-4"
      />
    </template>

     <template #right>
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