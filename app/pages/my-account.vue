<script setup lang="ts">
import { z } from 'zod'

// Page accessible à tous les rôles connectés
// Les middlewares globaux (01.authenticated.global.ts et 02.role.global.ts)
// gèrent automatiquement l'authentification et les redirections

// Composables
const { user, refreshSession } = useAuth()
const toast = useToast()

// Déterminer le layout en fonction du rôle
const layout = computed(() => {
  switch (user.value?.role) {
    case 'FEEF':
      return 'dashboard-feef'
    case 'OE':
      return 'dashboard-oe'
    case 'AUDITOR':
      return 'dashboard-auditor'
    case 'ENTITY':
      return 'dashboard-entity'
    default:
      return 'default'
  }
})

// Appliquer le layout dynamiquement
setPageLayout(layout.value)

// Watch pour mettre à jour le layout si le rôle change
watch(() => user.value?.role, () => {
  setPageLayout(layout.value)
})

// États locaux
const isEditing = ref(false)
const isSaving = ref(false)
const isSendingPasswordReset = ref(false)
const oeName = ref<string | null>(null)
const isLoadingOe = ref(false)

// Formulaire d'édition
const editForm = reactive({
  firstname: '',
  lastname: '',
})

// Schéma de validation
const schema = z.object({
  firstname: z.string().min(1, 'Le prénom est requis'),
  lastname: z.string().min(1, 'Le nom est requis'),
})

// Récupérer le nom de l'OE si applicable
const fetchOeName = async () => {
  if (!user.value?.oeId) return

  isLoadingOe.value = true
  try {
    const response = await $fetch(`/api/oes/${user.value.oeId}`)
    oeName.value = response.data.name
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'OE:', error)
    oeName.value = null
  } finally {
    isLoadingOe.value = false
  }
}

// Charger le nom de l'OE au montage
onMounted(() => {
  if (user.value?.oeId && (user.value.role === 'OE' || user.value.role === 'AUDITOR')) {
    fetchOeName()
  }
})

// Activer le mode édition
const startEditing = () => {
  editForm.firstname = user.value?.firstname || ''
  editForm.lastname = user.value?.lastname || ''
  isEditing.value = true
}

// Annuler l'édition
const cancelEditing = () => {
  isEditing.value = false
  editForm.firstname = ''
  editForm.lastname = ''
}

// Sauvegarder les modifications
const saveChanges = async () => {
  if (!user.value) return

  // Validation
  try {
    schema.parse(editForm)
  } catch (error: any) {
    toast.add({
      title: 'Erreur de validation',
      description: error.errors[0]?.message || 'Les données sont invalides',
      color: 'error',
    })
    return
  }

  isSaving.value = true
  try {
    await $fetch(`/api/accounts/${user.value.id}`, {
      method: 'PUT',
      body: {
        firstname: editForm.firstname,
        lastname: editForm.lastname,
      },
    })

    // Rafraîchir la session pour mettre à jour les données utilisateur
    await refreshSession()

    toast.add({
      title: 'Succès',
      description: 'Vos informations ont été mises à jour',
      color: 'success',
    })

    isEditing.value = false
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || 'Une erreur est survenue lors de la mise à jour',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

// Envoyer un email de réinitialisation du mot de passe
const sendPasswordResetEmail = async () => {
  if (!user.value?.email) return

  isSendingPasswordReset.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: user.value.email,
      },
    })

    toast.add({
      title: 'Email envoyé',
      description: 'Un email de réinitialisation a été envoyé à votre adresse',
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || 'Une erreur est survenue lors de l\'envoi de l\'email',
      color: 'error',
    })
  } finally {
    isSendingPasswordReset.value = false
  }
}

// Formater la date de création
const formatDate = (date: Date | string | null) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('fr-FR')
}

// Obtenir la couleur du badge en fonction du rôle
const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'FEEF':
      return 'primary'
    case 'OE':
      return 'success'
    case 'ENTITY':
      return 'warning'
    case 'AUDITOR':
      return 'purple'
    default:
      return 'neutral'
  }
}

// Obtenir le libellé du rôle en français
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'FEEF':
      return 'FEEF'
    case 'OE':
      return 'Organisme Évaluateur'
    case 'ENTITY':
      return 'Entreprise'
    case 'AUDITOR':
      return 'Auditeur'
    default:
      return role
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mon Compte</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Gérez vos informations personnelles et vos paramètres de sécurité
      </p>
    </div>

    <div class="space-y-6">
      <!-- Section 1 : Informations personnelles -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user" class="size-5" />
              <span class="font-semibold">Informations personnelles</span>
            </div>
            <UButton
              v-if="!isEditing"
              label="Modifier"
              icon="i-lucide-pencil"
              size="sm"
              variant="outline"
              @click="startEditing"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Mode lecture -->
          <div v-if="!isEditing" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
              <p class="mt-1 text-gray-900 dark:text-white">{{ user?.firstname }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
              <p class="mt-1 text-gray-900 dark:text-white">{{ user?.lastname }}</p>
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <div class="mt-1 flex items-center gap-2">
                <UIcon name="i-lucide-mail" class="size-4 text-gray-400" />
                <p class="text-gray-900 dark:text-white">{{ user?.email }}</p>
              </div>
            </div>
          </div>

          <!-- Mode édition -->
          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Prénom *</label>
                <UInput v-model="editForm.firstname" size="lg" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Nom *</label>
                <UInput v-model="editForm.lastname" size="lg" class="mt-1" />
              </div>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <div class="mt-1 flex items-center gap-2">
                <UIcon name="i-lucide-mail" class="size-4 text-gray-400" />
                <p class="text-gray-500 dark:text-gray-400">{{ user?.email }} (non modifiable)</p>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                label="Annuler"
                variant="outline"
                @click="cancelEditing"
              />
              <UButton
                label="Enregistrer"
                icon="i-lucide-save"
                :loading="isSaving"
                @click="saveChanges"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 2 : Informations du compte -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="size-5" />
            <span class="font-semibold">Informations du compte</span>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Rôle</label>
            <div class="mt-1">
              <UBadge
                :label="getRoleLabel(user?.role || '')"
                :color="getRoleBadgeColor(user?.role || '')"
                size="lg"
              />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Membre depuis</label>
            <div class="mt-1 flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="size-4 text-gray-400" />
              <p class="text-gray-900 dark:text-white">{{ formatDate(user?.createdAt) }}</p>
            </div>
          </div>

          <div v-if="user?.oeId && (user?.role === 'OE' || user?.role === 'AUDITOR')">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Organisme évaluateur</label>
            <div class="mt-1 flex items-center gap-2">
              <UIcon name="i-lucide-building" class="size-4 text-gray-400" />
              <p v-if="isLoadingOe" class="text-gray-500 dark:text-gray-400">Chargement...</p>
              <p v-else class="text-gray-900 dark:text-white">{{ oeName || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 3 : Sécurité -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-lock" class="size-5" />
            <span class="font-semibold">Sécurité</span>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe</label>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pour modifier votre mot de passe, nous vous enverrons un email avec un lien de réinitialisation.
            </p>
            <UButton
              label="Réinitialiser mon mot de passe"
              icon="i-lucide-mail"
              variant="outline"
              class="mt-2"
              :loading="isSendingPasswordReset"
              @click="sendPasswordResetEmail"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
