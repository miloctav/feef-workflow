<template>
  <div class="flex items-center justify-center h-screen">
    <UCard>
      <template #header>
        <h1 class="text-2xl font-bold text-center">Connexion</h1>
        <p class="text-center text-gray-500">Sélectionnez un profil pour continuer</p>
      </template>

      <div class="space-y-4">
        <UButton
          block
          label="Super Administrateur (FEEF)"
          to="/feef"
          size="xl"
          icon="i-heroicons-user-circle"
        />
        <UButton
          block
          label="Organisme Évaluateur"
          to="/organisme"
          size="xl"
          color="secondary"
          icon="i-heroicons-user-group"
        />
        <UButton
          block
          label="Entreprise"
          to="/entreprise"
          size="xl"
          color="neutral"
          icon="i-heroicons-building-office"
        />
      </div>
    </UCard>
  </div>
</template>
