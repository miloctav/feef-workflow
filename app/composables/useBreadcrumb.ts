import type { AuditWithRelations } from '~~/app/types/audits'

// Interface pour les éléments du breadcrumb
interface BreadcrumbItem {
  label: string
  icon?: string
  to?: string
}

export function useBreadcrumb() {
  const route = useRoute()
  const { currentEntity, currentFollowerEntity } = useEntities()
  const { currentAudit } = useAudits()
  const { currentOE } = useOes()

  // Détection explicite de la source de données basée sur la route
  const dataSource = computed(() => {
    const segments = route.path.split('/').filter(Boolean)

    if (segments.includes('audits')) return 'audit'
    if (segments.includes('entities') || segments.includes('followers')) return 'entity'
    if (segments.includes('oes')) return 'oe'

    return null
  })

  // Mapping des segments connus vers des labels lisibles
  const segmentMapping: Record<string, { label: string; icon: string } | null> = {
    'entities': { label: 'Entreprises', icon: 'i-heroicons-building-storefront' },
    'audits': { label: 'Audits', icon: 'i-heroicons-folder' },
    'oes': { label: 'Organismes Évaluateurs', icon: 'i-heroicons-building-office' },
    'settings': { label: 'Paramètres', icon: 'i-heroicons-cog-6-tooth' },
    'notifications': { label: 'Notifications', icon: 'i-heroicons-bell' },
    'followers': { label: 'Entités suivies', icon: 'i-heroicons-users' },
    'contracts': { label: 'Contrats', icon: 'i-heroicons-document-text' },
    'documents': { label: 'Documents', icon: 'i-heroicons-folder-open' },
    'accounts': { label: 'Comptes', icon: 'i-heroicons-user-group' },

    // Préfixes de rôle à ignorer
    'feef': null,
    'oe': null,
    'entity': null,
    'auditor': null,
  }

  // Helper pour formater les labels d'audit avec le nom de l'entité
  function formatAuditLabel(audit: AuditWithRelations): string {
    const entityName = audit.entity?.name || 'Entité inconnue'
    return `Audit #${audit.id} - ${entityName}`
  }

  // Computed principal qui génère les breadcrumb items
  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const pathSegments = route.path.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []
    let currentPath = ''

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath += `/${segment}`

      // Vérifier si le segment doit être ignoré (null dans le mapping)
      const mapping = segmentMapping[segment]
      if (mapping === null) {
        continue // Ignorer les préfixes de rôle
      }

      // Gérer les segments mappés (statiques)
      if (mapping) {
        items.push({
          label: mapping.label,
          icon: mapping.icon,
          // Le dernier élément n'a pas de lien
          to: i === pathSegments.length - 1 ? undefined : currentPath
        })
        continue
      }

      // Gérer les IDs numériques (segments dynamiques)
      if (/^\d+$/.test(segment)) {
        let label = `#${segment}`
        let icon = 'i-heroicons-hashtag'

        // Remplacer par le nom réel quand les données sont disponibles
        if (dataSource.value === 'entity') {
          // Pour les pages followers, utiliser currentFollowerEntity
          const isFollowerPage = route.path.includes('/followers/')
          const entityData = isFollowerPage ? currentFollowerEntity.value : currentEntity.value

          if (entityData) {
            label = entityData.name
            icon = 'i-heroicons-building-storefront'
          }
        } else if (dataSource.value === 'audit' && currentAudit.value) {
          label = formatAuditLabel(currentAudit.value)
          icon = 'i-heroicons-folder'
        } else if (dataSource.value === 'oe' && currentOE.value) {
          label = currentOE.value.name
          icon = 'i-heroicons-building-office'
        }

        items.push({
          label,
          icon,
          // Le dernier élément (ID) n'a jamais de lien
          to: undefined
        })
        continue
      }

      // Segments inconnus - capitaliser et utiliser tel quel
      items.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        to: i === pathSegments.length - 1 ? undefined : currentPath
      })
    }

    return items
  })

  return {
    breadcrumbItems
  }
}
