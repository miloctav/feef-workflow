import { eq, isNull, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { entities, documentsType, documentaryReviews, accounts, accountsToEntities, NewAccount } from "~~/server/database/schema"
import { forInsert } from "~~/server/utils/tracking"
import { EntityType, EntityMode } from "~~/shared/types/enums"
import bcrypt from 'bcrypt'
import { generatePasswordResetUrlAndToken } from '~~/server/utils/password-reset'
import { sendAccountCreationEmail } from '~~/server/services/mail'
import { Role, EntityRole } from '~~/shared/types/roles'
import { ActionType } from '~~/shared/types/actions'

interface CreateEntityBody {
  name: string
  type: typeof EntityType[keyof typeof EntityType]
  mode: typeof EntityMode[keyof typeof EntityMode]
  siret: string
  parentGroupId?: number
  oeId?: number
  accountManagerId?: number

  // Champs pour la création de compte optionnelle
  createAccount?: boolean
  accountFirstname?: string
  accountLastname?: string
  accountEmail?: string
  accountEntityRole?: string

  // Option de workflow
  triggerCaseSubmission?: boolean
}

export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

  // FEEF peut créer n'importe quelle entité
  // ENTITY peut créer uniquement des entités suiveuses liées à son currentEntity
  if (currentUser.role !== 'FEEF' && currentUser.role !== 'ENTITY') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé.'
    })
  }

  const body = await readBody<CreateEntityBody>(event)

  const { name, type, mode, siret, parentGroupId, oeId, accountManagerId, createAccount, accountFirstname, accountLastname, accountEmail, accountEntityRole, triggerCaseSubmission } = body

  // Validation des champs requis
  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Le nom est requis.'
    })
  }

  if (!type) {
    throw createError({
      statusCode: 400,
      message: 'Le type est requis.'
    })
  }

  if (!mode) {
    throw createError({
      statusCode: 400,
      message: 'Le mode est requis.'
    })
  }

  if (!siret) {
    throw createError({
      statusCode: 400,
      message: 'Le SIRET est requis.'
    })
  }

  // Validation des valeurs d'enum
  if (!Object.values(EntityType).includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Type invalide. Les valeurs autorisées sont: COMPANY, GROUP.'
    })
  }

  if (!Object.values(EntityMode).includes(mode)) {
    throw createError({
      statusCode: 400,
      message: 'Mode invalide. Les valeurs autorisées sont: MASTER, FOLLOWER.'
    })
  }

  // Variable pour stocker l'entité maître (utilisée plus bas pour le cas COMPANY -> GROUP)
  let masterEntityForUpdate: { id: number; type: string; parentGroupId: number | null } | null = null

  // Validation spécifique pour le rôle ENTITY
  if (currentUser.role === 'ENTITY') {
    // Doit avoir un currentEntityId
    if (!currentUser.currentEntityId) {
      throw createError({
        statusCode: 403,
        message: 'Vous devez être associé à une entité pour créer des suiveuses.'
      })
    }

    // Doit créer en mode FOLLOWER
    if (mode !== EntityMode.FOLLOWER) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez créer que des entités suiveuses.'
      })
    }

    // Récupérer l'entité maître pour valider le type
    const masterEntity = await db.query.entities.findFirst({
      where: eq(entities.id, currentUser.currentEntityId),
      columns: { id: true, type: true, parentGroupId: true },
      with: { childEntities: { columns: { id: true, type: true } } }
    })

    if (!masterEntity) {
      throw createError({
        statusCode: 404,
        message: 'Entité maître non trouvée.'
      })
    }

    // Si master est GROUP → ne peut créer que COMPANY (parentGroupId doit pointer vers le GROUP)
    // Si master est COMPANY → ne peut créer que GROUP (pas de parentGroupId, on met à jour la COMPANY après)
    if (masterEntity.type === EntityType.GROUP) {
      if (type !== EntityType.COMPANY) {
        throw createError({
          statusCode: 400,
          message: 'Un groupe ne peut avoir que des entreprises suiveuses.'
        })
      }
      // Vérifier que parentGroupId pointe bien vers le GROUP master
      if (parentGroupId !== currentUser.currentEntityId) {
        throw createError({
          statusCode: 403,
          message: 'Vous ne pouvez créer des suiveuses que pour votre groupe.'
        })
      }
      const existingFollowers = masterEntity.childEntities?.length || 0
      if (existingFollowers >= 10) {
        throw createError({
          statusCode: 400,
          message: 'Limite de 10 entreprises suiveuses atteinte.'
        })
      }
    } else {
      // Master est COMPANY → créer un GROUP follower
      if (type !== EntityType.GROUP) {
        throw createError({
          statusCode: 400,
          message: 'Une entreprise ne peut être liée qu\'à un groupe.'
        })
      }
      // Vérifier que la COMPANY n'a pas déjà un groupe lié
      if (masterEntity.parentGroupId) {
        throw createError({
          statusCode: 400,
          message: 'Cette entreprise est déjà liée à un groupe.'
        })
      }
      // Stocker pour mise à jour après création du GROUP
      masterEntityForUpdate = masterEntity
    }
  }

  // Validation : si type=COMPANY et mode=FOLLOWER, parentGroupId est obligatoire
  if (type === EntityType.COMPANY && mode === EntityMode.FOLLOWER && !parentGroupId) {
    throw createError({
      statusCode: 400,
      message: 'Le parentGroupId est requis pour une entreprise en mode FOLLOWER.'
    })
  }

  // Si parentGroupId est fourni par FEEF, vérifier que le parent existe et est bien un GROUP
  // (Pour ENTITY, la validation est déjà faite plus haut avec des règles spécifiques)
  if (parentGroupId && currentUser.role === 'FEEF') {
    const parentGroup = await db.query.entities.findFirst({
      where: eq(entities.id, parentGroupId),
      columns: {
        id: true,
        type: true,
      }
    })

    if (!parentGroup) {
      throw createError({
        statusCode: 404,
        message: 'Le groupe parent spécifié n\'existe pas.'
      })
    }

    if (parentGroup.type !== EntityType.GROUP) {
      throw createError({
        statusCode: 400,
        message: 'Le parentGroupId doit correspondre à une entité de type GROUP.'
      })
    }
  }

  const existingEntityWithSiret = await db.query.entities.findFirst({
    where: eq(entities.siret, siret),
    columns: { id: true }
  })

  if (existingEntityWithSiret) {
    throw createError({
      statusCode: 400,
      message: 'Une entité avec ce SIRET existe déjà.'
    })
  }

  // Validation pour la création de compte
  if (createAccount) {
    if (!accountFirstname || !accountLastname || !accountEmail || !accountEntityRole) {
      throw createError({
        statusCode: 400,
        message: 'Tous les champs (Prénom, Nom, Email, Rôle) sont requis pour créer ou associer un compte.'
      })
    }
  }

  // Construire l'objet de création en n'incluant que les champs fournis
  const insertData: any = {
    name,
    type,
    mode,
    siret,
  }

  if (parentGroupId !== undefined) insertData.parentGroupId = parentGroupId
  if (oeId !== undefined) insertData.oeId = oeId
  if (accountManagerId !== undefined) insertData.accountManagerId = accountManagerId

  const [newEntity] = await db.insert(entities).values(forInsert(event, insertData)).returning()

  // Si une COMPANY master a créé un GROUP follower, mettre à jour la COMPANY pour pointer vers le GROUP
  if (masterEntityForUpdate && newEntity.type === EntityType.GROUP) {
    await db.update(entities)
      .set({ parentGroupId: newEntity.id })
      .where(eq(entities.id, masterEntityForUpdate.id))
  }

  // Récupérer tous les documents types avec autoAsk = true
  const autoAskDocuments = await db.query.documentsType.findMany({
    where: and(
      eq(documentsType.autoAsk, true),
      isNull(documentsType.deletedAt)
    ),
  })

  // Créer automatiquement les revues documentaires pour les documents avec autoAsk = true
  if (autoAskDocuments.length > 0) {
    const documentaryReviewsToInsert = autoAskDocuments.map(docType =>
      forInsert(event, {
        entityId: newEntity.id,
        documentTypeId: docType.id,
        title: docType.title,
        description: docType.description,
        category: docType.category,
      })
    )

    await db.insert(documentaryReviews).values(documentaryReviewsToInsert)
  }

  // Si c'est une entité MASTER, créer l'action "Dépôt de dossier" (ENTITY_SUBMIT_CASE) uniquement si demandé
  // Par défaut (triggerCaseSubmission === undefined) on ne le fait pas, mais le front l'envoie à true par défaut
  if (newEntity.mode === EntityMode.MASTER && triggerCaseSubmission) {
    const { createAction } = await import('~~/server/services/actions')
    await createAction(ActionType.ENTITY_SUBMIT_CASE, newEntity.id, event)
  }

  // LOGIQUE DE CRÉATION DE COMPTE / LIAISON
  let accountResult = null;
  if (createAccount && accountFirstname && accountLastname && accountEmail && accountEntityRole) {
    try {
      console.log('[Entities API] Tentative de création/liaison de compte pour', accountEmail);

      // 1. Vérifier si un compte existe déjà avec cet email
      const existingAccount = await db.query.accounts.findFirst({
        where: eq(accounts.email, accountEmail)
      });

      let accountIdToLink: number;

      if (existingAccount) {
        console.log('[Entities API] Compte existant trouvé pour', accountEmail);

        // Vérifier si le compte a le rôle ENTITY
        if (existingAccount.role !== Role.ENTITY) {
          console.warn('[Entities API] Le compte existant n\'a pas le rôle ENTITY. Liaison ignorée.');
          // On pourrait throw une erreur ici, mais pour l'UX il vaut mieux peut-être ne pas bloquer la création de l'entité
          // Pour l'instant on continue mais on ne lie pas (ou on pourrait choisir de lier quand même ?)
          // La demande spécifiait "affecter le compte existant", supposons qu'il doit être compatible.
        }

        if (existingAccount.role === Role.ENTITY) {
          accountIdToLink = existingAccount.id;

          // Vérifier si déjà lié à cette entité (peu probable car l'entité vient d'être créée)
          const existingLink = await db.query.accountsToEntities.findFirst({
            where: and(
              eq(accountsToEntities.accountId, accountIdToLink),
              eq(accountsToEntities.entityId, newEntity.id)
            )
          });

          if (!existingLink) {
            // Créer le lien
            await db.insert(accountsToEntities).values({
              accountId: accountIdToLink,
              entityId: newEntity.id,
              role: accountEntityRole as any
            });
            console.log('[Entities API] Compte existant lié à la nouvelle entité');
          }
        }

      } else {
        // 2. Créer un nouveau compte
        console.log('[Entities API] Création d\'un nouveau compte pour', accountEmail);

        const config = useRuntimeConfig(event)
        const isDevMode = config.devMode

        const newAccountData: NewAccount = {
          firstname: accountFirstname,
          lastname: accountLastname,
          email: accountEmail,
          role: Role.ENTITY, // Force role ENTITY
          isActive: isDevMode ? true : false,
          passwordChangedAt: isDevMode ? new Date() : null,
          password: isDevMode ? await bcrypt.hash('password', 10) : undefined,
        }

        const [createdAccount] = await db
          .insert(accounts)
          .values(forInsert(event, newAccountData))
          .returning()

        accountIdToLink = createdAccount.id;

        // 3. Lier le nouveau compte à l'entité
        await db.insert(accountsToEntities).values({
          accountId: accountIdToLink,
          entityId: newEntity.id,
          role: accountEntityRole as any
        });

        // 4. Envoyer email d'invitation (sauf en DEV)
        if (!isDevMode) {
          const { resetUrl } = await generatePasswordResetUrlAndToken(createdAccount.id, event)

          await sendAccountCreationEmail({
            email: createdAccount.email,
            firstName: createdAccount.firstname,
            lastName: createdAccount.lastname,
            role: 'Entreprise',
            resetPasswordUrl: resetUrl,
            expiresInHours: 48
          })
          console.log('[Entities API] Email d\'invitation envoyé');
        } else {
          console.log('[Entities API] Mode DEV: pas d\'email envoyé. MDP: password');
        }
      }

    } catch (error) {
      console.error('[Entities API] Erreur lors de la gestion du compte associé:', error);
      // On ne fait pas échouer la requête principale si la création de compte échoue, 
      // car l'entité est déjà créée. Idéalement on préviendrait l'utilisateur.
    }
  }

  return {
    data: newEntity
  }
})
