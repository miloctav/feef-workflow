<script setup lang="ts">
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'candidature':
      return 'i-lucide-user-plus'
    case 'validation':
      return 'i-lucide-check-circle'
    case 'document':
      return 'i-lucide-file-text'
    case 'decision':
      return 'i-lucide-gavel'
    default:
      return 'i-lucide-bell'
  }
}
import { formatTimeAgo } from '@vueuse/core'

const { isNotificationsSlideoverOpen } = useDashboard()
const route = useRoute()

// Détecter le rôle en fonction de la route
const notificationsPagePath = computed(() => {
  const path = route.path
  if (path.startsWith('/feef')) {
    return '/feef/notifications'
  } else if (path.startsWith('/oe')) {
    return '/oe/notifications'
  } else if (path.startsWith('/company')) {
    return '/company/notifications'
  }
  return '/feef/notifications' // fallback
})

interface Notification {
  id: string
  title: string
  description: string
  date: string
  dossier: string
  type: 'candidature' | 'validation' | 'document' | 'decision'
}

const notifications = [
  {
    id: '1',
    title: 'Nouvelle candidature reçue',
    description: 'Une nouvelle entreprise a soumis sa candidature pour la labellisation FEEF.',
    date: '11/09/2025 14:30',
    dossier: 'DOSSIER-2025-089',
    type: 'candidature'
  },
  {
    id: '2',
    title: 'Documents manquants',
    description: 'Des documents obligatoires sont manquants dans le dossier. Intervention nécessaire.',
    date: '11/09/2025 09:15',
    dossier: 'DOSSIER-2025-087',
    type: 'document'
  },
  {
    id: '3',
    title: "Rapport d'audit transmis",
    description: "L'organisme évaluateur a transmis le rapport d'audit final.",
    date: '10/09/2025 16:45',
    dossier: 'DOSSIER-2025-085',
    type: 'document'
  },
  {
    id: '4',
    title: "Validation du plan d'action",
    description: "Le plan d'action corrective a été validé par l'OE et est prêt pour décision.",
    date: '10/09/2025 11:20',
    dossier: 'DOSSIER-2025-084',
    type: 'validation'
  },
  {
    id: '5',
    title: 'Décision FEEF en attente',
    description: "Un avis de labellisation est en attente de validation par la direction FEEF.",
    date: '09/09/2025 15:30',
    dossier: 'DOSSIER-2025-083',
    type: 'decision'
  },
  {
    id: '6',
    title: "Signature d'attestation requise",
    description: "Une attestation de labellisation est prête et nécessite une signature.",
    date: '09/09/2025 10:00',
    dossier: 'DOSSIER-2025-082',
    type: 'decision'
  },
  {
    id: '7',
    title: 'Nouvelle version de document',
    description: "L'entreprise a mis à jour ses statuts. Version 2 disponible.",
    date: '08/09/2025 14:15',
    dossier: 'DOSSIER-2025-081',
    type: 'document'
  },
  {
    id: '8',
    title: 'Audit programmé',
    description: "L'audit sur site a été programmé et confirmé par l'organisme évaluateur.",
    date: '07/09/2025 09:30',
    dossier: 'DOSSIER-2025-080',
    type: 'validation'
  }
]
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notifications"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="text-lg font-semibold text-gray-900">
          Notifications
        </h2>
        <UButton
          :to="notificationsPagePath"
          color="primary"
          variant="ghost"
          size="sm"
          icon="i-lucide-list"
          @click="isNotificationsSlideoverOpen = false"
        >
          Voir toutes
        </UButton>
      </div>
    </template>
    <template #body>
      <div class="space-y-3 px-2 py-2">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200"
        >
          <div class="flex items-start gap-4">
            <!-- Icône de notification -->
            <div class="flex-shrink-0 mt-1">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="{
                  'bg-blue-100 text-blue-600': notification.type === 'candidature',
                  'bg-green-100 text-green-600': notification.type === 'validation',
                  'bg-orange-100 text-orange-600': notification.type === 'document',
                  'bg-purple-100 text-purple-600': notification.type === 'decision'
                }"
              >
                <UIcon :name="getNotificationIcon(notification.type)" class="w-4 h-4" />
              </div>
            </div>
            <!-- Contenu de la notification -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h3 class="text-sm font-semibold text-gray-900 mb-1">
                    {{ notification.title }}
                  </h3>
                  <p class="text-sm text-gray-600 mb-2">
                    {{ notification.description }}
                  </p>
                  <div class="flex items-center gap-4 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                      {{ notification.date }}
                    </span>
                  </div>
                </div>
                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <UButton
                    color="primary"
                    variant="outline"
                    size="xs"
                    icon="i-lucide-external-link"
                  >
                    Voir le dossier
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>