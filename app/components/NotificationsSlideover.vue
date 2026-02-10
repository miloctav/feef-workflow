<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()
const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications()
const route = useRoute()
const router = useRouter()

// Détecter le rôle en fonction de la route
const notificationsPagePath = computed(() => {
  const path = route.path
  if (path.startsWith('/feef')) return '/feef/notifications'
  if (path.startsWith('/oe')) return '/oe/notifications'
  if (path.startsWith('/entity')) return '/entity/notifications'
  return '/feef/notifications'
})

// Fetch on open
watch(isNotificationsSlideoverOpen, (open) => {
  if (open) {
    fetchNotifications(1, { limit: 10 })
  }
})

function getNotificationIcon(type: string) {
  switch (type) {
    case 'action_created':
      return 'i-lucide-clipboard-list'
    case 'action_reminder':
      return 'i-lucide-alarm-clock'
    default:
      return 'i-lucide-bell'
  }
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function handleNotificationClick(notification: any) {
  markAsRead(notification.id)

  // Navigate based on context
  const path = route.path
  let prefix = '/feef'
  if (path.startsWith('/oe')) prefix = '/oe'
  else if (path.startsWith('/entity')) prefix = '/entity'
  else if (path.startsWith('/auditor')) prefix = '/auditor'

  if (notification.auditId) {
    router.push(`${prefix}/audits/${notification.auditId}`)
  } else if (notification.entityId) {
    router.push(`${prefix}/entities/${notification.entityId}`)
  }

  isNotificationsSlideoverOpen.value = false
}

function handleMarkAllAsRead() {
  markAllAsRead()
}
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
          <span v-if="unreadCount > 0" class="text-sm font-normal text-gray-500">({{ unreadCount }} non lue{{ unreadCount > 1 ? 's' : '' }})</span>
        </h2>
        <div class="flex items-center gap-2">
          <UButton
            v-if="unreadCount > 0"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-check-check"
            @click="handleMarkAllAsRead"
          >
            Tout marquer lu
          </UButton>
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
      </div>
    </template>
    <template #body>
      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-gray-400" />
      </div>

      <!-- Empty state -->
      <div v-else-if="notifications.length === 0" class="text-center py-12 px-4">
        <UIcon name="i-lucide-bell-off" class="size-12 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-500">Aucune notification</p>
      </div>

      <!-- List -->
      <div v-else class="space-y-2 px-2 py-2">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:shadow-md"
          :class="notification.readAt ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex items-start gap-3">
            <!-- Unread indicator -->
            <div class="flex-shrink-0 mt-1.5">
              <div
                v-if="!notification.readAt"
                class="w-2 h-2 rounded-full bg-blue-500"
              />
              <div v-else class="w-2 h-2" />
            </div>

            <!-- Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <UIcon :name="getNotificationIcon(notification.type)" class="w-4 h-4" />
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                {{ notification.title }}
              </h3>
              <p v-if="notification.entity" class="text-xs text-gray-500 mb-1">
                {{ notification.entity.name }}
              </p>
              <p class="text-xs text-gray-400">
                {{ formatTimeAgo(notification.createdAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
