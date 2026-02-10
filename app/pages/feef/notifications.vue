<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <div class="p-6">
        <!-- En-tête de la page -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Notifications</h1>
            <p class="text-gray-600 mt-1">Suivez les événements importants de vos dossiers FEEF</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="unreadCount > 0"
              icon="i-lucide-check-check"
              variant="outline"
              @click="handleMarkAllAsRead"
            >
              Tout marquer lu
            </UButton>
            <UButton
              icon="i-lucide-refresh-cw"
              variant="outline"
              :loading="isLoading"
              @click="refreshNotifications"
            >
              Actualiser
            </UButton>
          </div>
        </div>

        <!-- Filtre non-lu -->
        <div class="flex items-center gap-4 mb-4">
          <UButton
            :variant="!unreadOnly ? 'solid' : 'outline'"
            size="sm"
            @click="unreadOnly = false; refreshNotifications()"
          >
            Toutes ({{ meta?.total || 0 }})
          </UButton>
          <UButton
            :variant="unreadOnly ? 'solid' : 'outline'"
            size="sm"
            @click="unreadOnly = true; refreshNotifications()"
          >
            Non lues ({{ unreadCount }})
          </UButton>
        </div>

        <!-- Loading -->
        <div v-if="isLoading && notifications.length === 0" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400" />
        </div>

        <!-- Liste des notifications -->
        <div v-else-if="notifications.length > 0" class="space-y-3">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
            :class="notification.readAt ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start gap-4">
              <!-- Unread indicator + Icon -->
              <div class="flex-shrink-0 mt-1 flex items-center gap-2">
                <div
                  v-if="!notification.readAt"
                  class="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"
                />
                <div v-else class="w-2.5 h-2.5 flex-shrink-0" />
                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
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
                    <p v-if="notification.description" class="text-sm text-gray-600 mb-2">
                      {{ notification.description }}
                    </p>
                    <div class="flex items-center gap-4 text-xs text-gray-500">
                      <span class="flex items-center gap-1">
                        <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                        {{ formatDate(notification.createdAt) }}
                      </span>
                      <span v-if="notification.entity" class="flex items-center gap-1">
                        <UIcon name="i-lucide-building" class="w-3 h-3" />
                        {{ notification.entity.name }}
                      </span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <UButton
                      v-if="!notification.readAt"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-check"
                      @click.stop="markAsRead(notification.id)"
                    />
                    <UButton
                      v-if="notification.auditId || notification.entityId"
                      color="primary"
                      variant="outline"
                      size="xs"
                      icon="i-lucide-external-link"
                      @click.stop="handleNotificationClick(notification)"
                    >
                      Voir
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message vide -->
        <div v-else class="text-center py-12">
          <UIcon name="i-lucide-bell-off" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
          <p class="text-gray-600">
            {{ unreadOnly ? 'Aucune notification non lue.' : 'Vous n\'avez aucune notification.' }}
          </p>
        </div>

        <!-- Pagination -->
        <div v-if="meta && meta.totalPages > 1" class="flex justify-center mt-6">
          <UPagination
            :model-value="currentPage"
            :total="meta.total"
            :items-per-page="meta.limit"
            @update:model-value="goToPage"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard-feef'
})

const router = useRouter()
const { notifications, meta, isLoading, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()

const currentPage = ref(1)
const unreadOnly = ref(false)

onMounted(() => {
  refreshNotifications()
})

function refreshNotifications() {
  fetchNotifications(currentPage.value, { limit: 20, unreadOnly: unreadOnly.value })
}

function goToPage(page: number) {
  currentPage.value = page
  refreshNotifications()
}

function handleMarkAllAsRead() {
  markAllAsRead()
}

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

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function handleNotificationClick(notification: any) {
  markAsRead(notification.id)

  if (notification.auditId) {
    router.push(`/feef/audits/${notification.auditId}`)
  } else if (notification.entityId) {
    router.push(`/feef/entities/${notification.entityId}`)
  }
}
</script>
