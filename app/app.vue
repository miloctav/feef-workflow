<script setup lang="ts">
const { loggedIn } = useUserSession()
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SessionWarningModal v-if="loggedIn" />
  </UApp>
</template>
