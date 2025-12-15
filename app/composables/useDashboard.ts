import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const isNotificationsSlideoverOpen = ref(false)
  const isActionsSlideoverOpen = ref(false)

  defineShortcuts({
    'n': () => isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value,
    't': () => isActionsSlideoverOpen.value = !isActionsSlideoverOpen.value
  })

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false
    isActionsSlideoverOpen.value = false
  })

  return {
    isNotificationsSlideoverOpen,
    isActionsSlideoverOpen
  }
}

export const useDashboard = createSharedComposable(_useDashboard)