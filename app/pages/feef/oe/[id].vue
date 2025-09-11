<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { ORGANISMES_EVALUATEURS, type OE, type Account } from "~/utils/data";

definePageMeta({
  layout: "dashboard-feef",
});

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UDropdownMenu = resolveComponent('UDropdownMenu');

const route = useRoute();
const oeId = computed(() => route.params.id as string);

// Trouver l'OE correspondant
const oe = computed(() => {
  return ORGANISMES_EVALUATEURS.find(o => o.id === oeId.value);
});

// Colonnes pour le tableau des comptes
const columns: TableColumn<Account>[] = [
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

// Fonction pour ajouter un compte (factice)
function ajouterCompte() {
  // Action factice pour l'instant
  console.log('Ajouter un nouveau compte pour', oe.value?.nom);
}

// Actions sur les comptes (factices)
function reinitialiserMotDePasse(account: Account) {
  console.log('Réinitialiser le mot de passe pour', account.prenom, account.nom);
  // Ici on pourrait ouvrir une modal de confirmation
}

function modifierRole(account: Account) {
  console.log('Modifier le rôle de', account.prenom, account.nom);
  // Ici on pourrait ouvrir une modal pour changer le rôle
}

function desactiverCompte(account: Account) {
  console.log('Désactiver le compte de', account.prenom, account.nom);
  // Ici on pourrait ouvrir une modal de confirmation
}

function supprimerCompte(account: Account) {
  console.log('Supprimer le compte de', account.prenom, account.nom);
  // Ici on pourrait ouvrir une modal de confirmation avec warning
}
</script>

<template>
  <UDashboardPanel id="oe">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <div v-if="!oe" class="flex items-center justify-center h-64">
        <div class="text-center">
          <h2 class="text-xl text-gray-600">Organisme évaluateur non trouvé</h2>
          <UButton 
            to="/feef/oe" 
            variant="ghost" 
            class="mt-4"
          >
            Retour à la liste
          </UButton>
        </div>
      </div>
      
      <div v-else class="w-full space-y-6 pb-4">
        <!-- Nom de l'OE en gros titre -->
        <div class="border-b border-gray-200 pb-4">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ oe.nom }}
          </h1>
          <p class="text-gray-600 dark:text-gray-300 mt-2">
            {{ oe.accounts.length }} compte{{ oe.accounts.length > 1 ? 's' : '' }} utilisateur{{ oe.accounts.length > 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Bouton d'ajout de compte -->
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

        <!-- Tableau des utilisateurs -->
        <UTable
          :data="oe.accounts"
          :columns="columns"
          class="flex-1"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
