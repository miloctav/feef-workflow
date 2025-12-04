<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
    collapsed?: boolean
}>()

const { user, logout } = useAuth()

const userItem = ref({
    name: user.value?.firstname + ' ' + user.value?.lastname,
    icon : 'i-lucide-user-circle',
})

const items = computed<DropdownMenuItem[][]>(() => ([[{
    type: 'label',
    label: userItem.value.name,
    icon: userItem.value.icon,
}], [{
    label: 'Mon compte',
    icon: 'i-lucide-user',
    onSelect: () => navigateTo('/my-account')
},
{
    label: 'Déconnexion',
    icon: 'i-lucide-log-out',
    onSelect: () => logout()
}],]))
</script>

<template>
    <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }"
        :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
        <UButton v-bind="{
            ...user,
            label: collapsed ? undefined : userItem?.name,
            trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
        }" color="neutral" variant="ghost" block :square="collapsed" class="data-[state=open]:bg-elevated" :ui="{
        trailingIcon: 'text-dimmed'
    }" />

        <template #chip-leading="{ item }">
            <span :style="{
                '--chip-light': `var(--color-${(item as any).chip}-500)`,
                '--chip-dark': `var(--color-${(item as any).chip}-400)`
            }" class="ms-0.5 size-2 rounded-full bg-(--chip-light) dark:bg-(--chip-dark)" />
        </template>
    </UDropdownMenu>
</template>