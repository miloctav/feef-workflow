import { Role } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est connecté et est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Seul un administrateur FEEF peut accéder à la liste des rôles',
    })
  }

  // Retourner la liste des rôles disponibles
  return {
    roles: [
      {
        value: Role.FEEF,
        label: 'Administrateur FEEF',
        description: 'Gère l\'ensemble du système',
      },
      {
        value: Role.OE,
        label: 'Organisme Évaluateur',
        description: 'Membre d\'un organisme évaluateur (admin ou chargé d\'affaire)',
      },
      {
        value: Role.AUDITOR,
        label: 'Auditeur',
        description: 'Réalise les audits terrain',
      },
      {
        value: Role.ENTITY,
        label: 'Entreprise',
        description: 'Utilisateur d\'une entreprise candidate (signataire ou gestionnaire de processus)',
      },
    ],
  }
})
