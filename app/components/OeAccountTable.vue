<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
        Comptes utilisateurs
      </h2>
      <UButton 
        @click="ajouterCompte"
        color="primary"
        icon="i-heroicons-plus"
      >
        Ajouter un compte
      </UButton>
    </div>
    <UTable
      :data="accounts"
      :columns="columns"
      class="flex-1"
    />
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from "vue";

const UBadge = resolveComponent('UBadge');
const UDropdownMenu = resolveComponent('UDropdownMenu');
const UButton = resolveComponent('UButton');

// Données fictives
const accounts = [
  { prenom: 'Alice', nom: 'Durand', email: 'alice@exemple.com', role: 'administrateur' },
  { prenom: 'Bob', nom: 'Martin', email: 'bob@exemple.com', role: 'charge-affaire' }
]

const columns = [
  {
    accessorKey: "nom",
    header: "Nom complet",
    cell: ({ row }) => `${row.original.prenom} ${row.original.nom}`,
  },
  {
    accessorKey: "email",
    header: "Adresse email",
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: "role",
    header: "Rôle",
    cell: ({ row }) => {
      const role = row.original.role;
      const roleLabel = role === 'administrateur' ? 'Administrateur' : 'Chargé d\'affaire';
      const roleColor = role === 'administrateur' ? 'error' : 'primary';
      return h(UBadge, { 
        color: roleColor, 
        variant: 'subtle',
        class: 'capitalize' 
      }, () => roleLabel);
    },
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
        onSelect() {
          reinitialiserMotDePasse(row.original);
        }
      }, {
        label: 'Modifier le rôle',
        icon: 'i-heroicons-user-circle',
        onSelect() {
          modifierRole(row.original);
        }
      }, {
        type: 'separator'
      },  {
        label: 'Supprimer le compte',
        icon: 'i-heroicons-trash',
        color: 'error',
        onSelect() {
          supprimerCompte(row.original);
        }
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
];

function ajouterCompte() {
  // Action factice
  console.log('Ajouter un nouveau compte');
}
function reinitialiserMotDePasse(account) {
  console.log('Réinitialiser le mot de passe pour', account.prenom, account.nom);
}
function modifierRole(account) {
  console.log('Modifier le rôle de', account.prenom, account.nom);
}
function supprimerCompte(account) {
  console.log('Supprimer le compte de', account.prenom, account.nom);
}
</script>
