export const useEntityContact = () => {
  const updateLoading = ref(false)

  const updateEntityContact = async (
    entityId: number,
    contactData: {
      address?: string | null
      addressComplement?: string | null
      postalCode?: string | null
      city?: string | null
      region?: string | null
      phoneNumber?: string | null
    }
  ) => {
    updateLoading.value = true
    try {
      const { data } = await $fetch(`/api/entities/${entityId}`, {
        method: 'PUT',
        body: contactData,
      })

      useToast().add({
        title: 'Coordonnées mises à jour',
        color: 'success',
      })

      return data
    } catch (error: any) {
      useToast().add({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour les coordonnées',
        color: 'error',
      })
      throw error
    } finally {
      updateLoading.value = false
    }
  }

  return {
    updateEntityContact,
    updateLoading,
  }
}
