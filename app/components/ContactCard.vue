<script setup lang="ts">
interface Contact {
  nom: string
  prenom: string
  fonction: string
  telephone: string
  portable?: string
  email: string
}

interface Props {
  contact: Contact
  icon: string
}

defineProps<Props>()
</script>

<template>
  <UCard>
    <template #header>
  <div class="bg-gray-100 w-full -mt-4 -mb-4 -ml-6 -mr-20 rounded-t-lg p-4">
    <UUser 
      :name="`${contact.prenom} ${contact.nom}`"
      :description="contact.fonction"
      :avatar="{ icon: icon }"
    />
  </div>
</template>
    
    <div class="space-y-3">
      <a 
        :href="`tel:${contact.telephone}`" 
        class="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
      >
        <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
        <span class="text-sm text-gray-700">{{ contact.telephone }}</span>
      </a>
      
      <a 
        v-if="contact.portable" 
        :href="`tel:${contact.portable}`" 
        class="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
      >
        <UIcon name="i-lucide-smartphone" class="w-4 h-4 text-gray-500" />
        <span class="text-sm text-gray-700">{{ contact.portable }}</span>
      </a>
      
      <a 
        :href="`mailto:${contact.email}`" 
        class="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
      >
        <UIcon name="i-lucide-mail" class="w-4 h-4 text-gray-500" />
        <span class="text-sm text-gray-700">{{ contact.email }}</span>
      </a>
    </div>
  </UCard>
</template>
