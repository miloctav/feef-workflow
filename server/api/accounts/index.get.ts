import { db } from '~~/server/database'
import { Role } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Seul un administrateur FEEF peut accéder à la liste des comptes',
    })
  }

  // Récupérer tous les comptes avec leurs relations
  const accounts = await db.query.accounts.findMany({
    columns: {
      password: false, // Exclure le mot de passe
    },
    with: {
      oe: {
        columns: {
          id: true,
          name: true,
        },
      },
      accountsToEntities: {
        columns: {
          entityId: true,
          role: true,
        },
        with: {
          entity: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
  })

  return {
    data: accounts,
  }
})
