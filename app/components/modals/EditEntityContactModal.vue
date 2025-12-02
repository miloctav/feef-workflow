<template>
  <UModal
    title="Modifier les coordonnées"
    :ui="{
      width: 'sm:max-w-2xl',
      footer: 'justify-end'
    }"
  >
    <UButton
      icon="i-lucide-pencil"
      size="xs"
      color="gray"
      variant="ghost"
      @click.stop
    >
      Modifier
    </UButton>

    <template #body>
      <form class="space-y-4">

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Adresse" class="col-span-2">
            <UInput
              v-model="form.address"
              placeholder="Ex: 123 rue de la République"
              :disabled="updateLoading"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Complément d'adresse" class="col-span-2">
            <UInput
              v-model="form.addressComplement"
              placeholder="Ex: Bâtiment A, 2ème étage"
              :disabled="updateLoading"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Code postal">
            <UInput
              v-model="form.postalCode"
              placeholder="Ex: 75001"
              :disabled="updateLoading"
            />
          </UFormField>
          <UFormField label="Ville">
            <UInput
              v-model="form.city"
              placeholder="Ex: Paris"
              :disabled="updateLoading"
            />
          </UFormField>
        </div>

        <UFormField label="Région">
          <UInput
            v-model="form.region"
            placeholder="Ex: Île-de-France"
            :disabled="updateLoading"
          />
        </UFormField>

        <UFormField label="Téléphone">
          <UInput
            v-model="form.phoneNumber"
            type="tel"
            placeholder="Ex: 01 23 45 67 89"
            :disabled="updateLoading"
          />
        </UFormField>
      </form>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        @click="close"
        :disabled="updateLoading"
      />
      <UButton
        label="Enregistrer"
        color="primary"
        :loading="updateLoading"
        @click="handleSubmit(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  entityId: number
  address?: string | null
  addressComplement?: string | null
  postalCode?: string | null
  city?: string | null
  region?: string | null
  phoneNumber?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  updated: []
}>()

const { updateEntityContact, updateLoading } = useEntityContact()

// Initialize form with current values
const form = reactive({
  address: props.address || '',
  addressComplement: props.addressComplement || '',
  postalCode: props.postalCode || '',
  city: props.city || '',
  region: props.region || '',
  phoneNumber: props.phoneNumber || '',
})

const handleSubmit = async (close: () => void) => {
  try {
    await updateEntityContact(props.entityId, {
      address: form.address || null,
      addressComplement: form.addressComplement || null,
      postalCode: form.postalCode || null,
      city: form.city || null,
      region: form.region || null,
      phoneNumber: form.phoneNumber || null,
    })
    emit('updated')
    close()
  } catch (error) {
    // Error handling is done in the composable
  }
}
</script>
