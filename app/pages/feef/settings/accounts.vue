<template>
    <UDashboardPanel id="accountsSettings">
        <template #header>
            <NavBar />
        </template>
        <template #body>
            <div class="mb-4 flex justify-end gap-2">
                <UButton color="primary" icon="i-lucide-plus" size="sm">Ajouter un compte</UButton>
            </div>
            <UTable :data="accounts" :columns="columns" class="mb-2" />
        </template>
    </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

definePageMeta({ layout: 'dashboard-feef' })

const UButton = resolveComponent('UButton');
const UDropdownMenu = resolveComponent('UDropdownMenu');

interface Account {
    email: string;
    role: 'Superadministrateur' | 'Administrateur';
    canSeeReport: boolean;
}

const columns: TableColumn<Account>[] = [
    {
        accessorKey: 'name',
        header: 'Nom complet',
        cell: ({ row }) => row.original?.email?.split('@')[0].replace('.', ' ').split(' ').map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') ?? ''
    },
    {
        accessorKey: 'email',
        header: 'Adresse mail'
    },
    {
        accessorKey: 'role',
        header: 'Rôle'
    },
    {
        accessorKey: 'canSeeReport',
        header: 'Peut voir rapport OE',
        cell: ({ row }) => row.getValue('canSeeReport') ? 'Oui' : 'Non',
        meta: { class: { td: 'text-center', th: 'text-center' } }
    },
    {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const items = [{
        type: 'label',
        label: 'Actions du compte'
      }, {
        label: 'Réinitialiser le mot de passe',
        icon: 'i-heroicons-key',
        onSelect() {}
      }, {
        label: 'Modifier le rôle',
        icon: 'i-heroicons-user-circle',
        onSelect() {}
      }, {
        type: 'separator'
      },  {
        label: 'Supprimer le compte',
        icon: 'i-heroicons-trash',
        color: 'error',
        onSelect() {}
      }];

      return h('div', { class: 'text-right' }, h(UDropdownMenu, {
        'content': {
          align: 'end'
        },
        items,
        'aria-label': 'Actions du compte'
      }, () => h(UButton, {
        'icon': 'i-heroicons-ellipsis-vertical',
        'color': 'neutral',
        'variant': 'ghost',
        'class': 'ml-auto',
        'aria-label': 'Actions du compte'
      })));
    }
  }
]

const accounts: Account[] = [
    { email: 'alice.dupont@fictif.com', role: 'Superadministrateur', canSeeReport: true },
    { email: 'bob.martin@fictif.com', role: 'Administrateur', canSeeReport: false },
    { email: 'charlie.lefevre@fictif.com', role: 'Administrateur', canSeeReport: true },
    { email: 'diane.moreau@fictif.com', role: 'Superadministrateur', canSeeReport: false },
    { email: 'emilie.bernard@fictif.com', role: 'Administrateur', canSeeReport: true }
]
</script>
