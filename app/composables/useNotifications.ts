import { createSharedComposable } from '@vueuse/core'

interface NotificationData {
  id: number
  accountId: number
  type: string
  title: string
  description: string | null
  entityId: number | null
  auditId: number | null
  actionId: number | null
  readAt: string | null
  emailSent: boolean
  metadata: any
  createdAt: string
  entity?: { id: number; name: string } | null
  audit?: { id: number; type: string; status: string } | null
}

interface NotificationsMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  unreadCount: number
}

const _useNotifications = () => {
  const unreadCount = ref(0)
  const notifications = ref<NotificationData[]>([])
  const meta = ref<NotificationsMeta | null>(null)
  const isLoading = ref(false)

  /**
   * Fetch unread count only (lightweight, for badge)
   */
  async function fetchUnreadCount() {
    try {
      const response = await $fetch<{ data: any[]; meta: NotificationsMeta }>('/api/notifications', {
        query: { page: 1, limit: 1 },
      })
      unreadCount.value = response.meta.unreadCount
    } catch (err) {
      console.error('[useNotifications] Error fetching unread count:', err)
    }
  }

  /**
   * Fetch notifications with pagination
   */
  async function fetchNotifications(page = 1, options: { limit?: number; unreadOnly?: boolean } = {}) {
    isLoading.value = true
    try {
      const response = await $fetch<{ data: NotificationData[]; meta: NotificationsMeta }>('/api/notifications', {
        query: {
          page,
          limit: options.limit || 20,
          unreadOnly: options.unreadOnly || undefined,
        },
      })
      notifications.value = response.data
      meta.value = response.meta
      unreadCount.value = response.meta.unreadCount
    } catch (err) {
      console.error('[useNotifications] Error fetching notifications:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Mark a single notification as read
   */
  async function markAsRead(notificationId: number) {
    try {
      await $fetch(`/api/notifications/${notificationId}`, { method: 'PUT' })

      // Update local state
      const notif = notifications.value.find(n => n.id === notificationId)
      if (notif && !notif.readAt) {
        notif.readAt = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (err) {
      console.error('[useNotifications] Error marking as read:', err)
    }
  }

  /**
   * Mark all notifications as read
   */
  async function markAllAsRead() {
    try {
      await $fetch('/api/notifications/read-all', { method: 'PUT' })

      // Update local state
      notifications.value.forEach(n => {
        if (!n.readAt) n.readAt = new Date().toISOString()
      })
      unreadCount.value = 0
    } catch (err) {
      console.error('[useNotifications] Error marking all as read:', err)
    }
  }

  return {
    unreadCount,
    notifications,
    meta,
    isLoading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}

export const useNotifications = createSharedComposable(_useNotifications)
