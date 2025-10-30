<script setup lang="ts">
const { user } = useUserSession()

// Redirection automatique selon le rôle de l'utilisateur
if (user.value) {
  const roleRoutes: Record<string, string> = {
    FEEF: '/feef',
    OE: '/oe',
    ENTITY: '/entity',
    AUDITOR: '/auditeur'
  }

  const targetRoute = roleRoutes[user.value.role]
  if (targetRoute) {
    await navigateTo(targetRoute)
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <div class="text-center">
      <p class="text-gray-500">Redirection en cours...</p>
    </div>
  </div>
</template>
