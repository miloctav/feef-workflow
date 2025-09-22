// utils/data.ts

export interface Alert {
  id: string
  type: 'warning' | 'info' | 'success'
  description: string
  icon?: string
  dismissible?: boolean
}

export interface Account {
  prenom: string
  nom: string
  email: string
  role: typeof accountRole[keyof typeof accountRole]
}

export interface OE {
  id: string
  nom: string
  accounts: Account[]
}

export interface Company {
  id: string
  raisonSociale: {
    nom: string
    siren: string
    adresse: string
    cp: string
    ville: string
    region: string
    telephone: string
  }
  pilote: {
    nom: string
    prenom: string
    fonction: string
    telephone: string
    portable: string
    email: string
  }
  dirigeant: {
    nom: string
    prenom: string
    fonction: string
    telephone: string
    portable: string
    email: string
  }
  comptabilite: {
    nom: string
    prenom: string
    fonction: string
    telephone: string
    email: string
  }
  appartenanceGroupe: {
    appartientGroupe: boolean
    nomGroupe?: string
    structuresLabellisees?: string[]
    structuresEnCoursLabellisation?: string[]
    wantEngageALLGroupe?: "Oui de suite" | "Oui d'ici quelques années" | "Non"
  }
  sites: {
    nombreSites: number
  }
  activites: {
    productionPropre: boolean
    productionSousTraitance: boolean
    conditionnementPropre: boolean
    conditionnementSousTraitance: boolean
    logistiquePropre: boolean
    logistiqueSousTraitance: boolean
    exclusionActivites: boolean
    activitesExclues?: string
    raisonExclusion?: string
  }
  sousTraitance: {
    nature: string
    partCATotale: number
    partCAFrance: number
    partCAEurope: number
    partCAHorsEurope: number
  }
  negoce: {
    nature?: string
    partCATotale?: number
    partCAFrance?: number
    partCAEurope?: number
    partCAHorsEurope?: number
  }
  produits: {
    partVolumeAlimentaires: number
    partVolumeNonAlimentaires: number
    natureProduits: string
    nombreGammes: number
    marques: string
  }
  perimetreLabellisation: string
  salaries: {
    nombreSalariesSiege: number
    personnelAdministratif: number
    personnelProduction: number
    nombreTotalSalaries: number
    presenceCSE: boolean
    ressourcesRSE: number
  }
  labellisations: {
    biologique: boolean
    labellisationQSE: string
    autreQSE?: string
    labellisationRSE?: string
    autreRSE?: string
    labellisationEquitable?: string
    autreEquitable?: string
  }
  auditSouhaite: {
    moisAudit: string
    organismeEvaluateur: string
  }
  eligibilite: {
    eligiblePME: boolean
    adherentFEEF: boolean
    fournisseurGD: boolean
    pratiquesEthiques: boolean
    commentaires?: string
    estEligible: boolean
    dateValidation: string
    signataire: {
      nom: string
      prenom: string
    }
  }
  workflow: {
    state : typeof labelingCaseState[keyof typeof labelingCaseState],
    type : typeof lebelingCaseType[keyof typeof lebelingCaseType],
    partageOE: string
    alerts?: Alert[]
    contratLabellisation: {
      envoiContrat: string
      contratSigne: string
    }
    contratOE: {
      contratSigne: string
      signePar?: string
    }
    audit: {
      type: string
      dateDebutPlanifiee: string
      dateFinPlanifiee: string
      auditeur: {
        nom: string
        prenom: string
      }
      dateTransmissionPlan: string
      revueDocumentaire: {
        dateTransmission: string
        datePartage: string
        documentsManquants?: number
      }
      dateDebutReelle: string
      dateFinReelle: string
    }
    rapport: {
      dateTransmission?: string
      performanceGlobale?: number
      rapport?: {
        dateTransmission?: string
        isAvailable?: boolean
      }
      planAction?: {
        requis?: boolean
        dateTransmission?: string
        dateLimiteDepot?: string
        isAvailable?: boolean
        valideParOE?: boolean
        dateValidation?: string
      }
    }
    avis: {
      dateTransmission?: string
      avis?: string
      decision?: string
      argumentaire?: string
      performanceGlobale?: number
      absencePointsBloquants?: boolean
      avisLabellisation?: {
        dateTransmission?: string
        isAvailable?: boolean
      }
      decisionFEEF?: {
        statut?: 'en_attente' | 'accepte'
        dateDecision?: string
        validePar?: string
      }
    }
    attestation: {
      dateTransmission?: string
      dateValidite?: string
      signatureFEEF?: {
        dateSigned?: string
        signePar?: string
        isGenerated?: boolean
      }
      signatureEntreprise?: {
        dateSigned?: string
        signePar?: string
        isConfirmed?: boolean
      }
    }
  }
}

export const labelingCaseState = {
  candidacy : "CANDIDATURE",
  engagement : "ENGAGEMENT", 
  audit : "AUDIT",
  decision : "DECISION",
  labeled : "LABELISE"
} as const

export const lebelingCaseType = {
  initial : "Initial",
  renouvellement : "Renouvellement",
} as const

export const accountRole = {
  administrateur: "administrateur",
  chargeAffaire: "chargé d'affaire"
} as const

export const COMPANIES: Company[] = [
  {
    id: "alpha",
    raisonSociale: {
      nom: "Alpha",
      siren: "XXXXXXXXXXXXX1",
      adresse: "Rue de la poste",
      cp: "78800",
      ville: "Houilles",
      region: "Ile-de-France",
      telephone: "01 02 05 04 66"
    },
    pilote: {
      nom: "HAMILTON",
      prenom: "Lewis",
      fonction: "Responsable Qualité",
      telephone: "01 02 05 04 66",
      portable: "06 12 31 23 23",
      email: "lewishamilton@alpha.fr"
    },
    dirigeant: {
      nom: "PAUL",
      prenom: "Jean",
      fonction: "Directeur Général",
      telephone: "01 02 05 04 66",
      portable: "06 12 31 23 25",
      email: "jeanpaul@alpha.fr"
    },
    comptabilite: {
      nom: "CHIFFRES",
      prenom: "Pierre",
      fonction: "Comptable",
      telephone: "01 02 05 04 60",
      email: "comptabilité@alfa.fr"
    },
    appartenanceGroupe: {
      appartientGroupe: false
    },
    sites: {
      nombreSites: 1
    },
    activites: {
      productionPropre: false,
      productionSousTraitance: true,
      conditionnementPropre: false,
      conditionnementSousTraitance: true,
      logistiquePropre: false,
      logistiqueSousTraitance: true,
      exclusionActivites: false
    },
    sousTraitance: {
      nature: "Nous faisons la R&D en interne, et nous adossons à des partenaires sous-traitants pour la fabrication des produits, à notre marque",
      partCATotale: 100,
      partCAFrance: 75,
      partCAEurope: 100,
      partCAHorsEurope: 0
    },
    negoce: {
      nature: "pas de négoce",
      partCATotale: 0,
      partCAFrance: 0,
      partCAEurope: 0,
      partCAHorsEurope: 0
    },
    produits: {
      partVolumeAlimentaires: 100,
      partVolumeNonAlimentaires: 0,
      natureProduits: "Création et commercialisation de produits nutritifs naturel",
      nombreGammes: 7,
      marques: "Marque Alpha"
    },
    perimetreLabellisation: "Création de produits nutritifs et naturels, activité de production sous-traitée à 100% avec maîtrise du cahier des charges. Conditionnement et logistique sous-traités à 100% avec maîtrise du cahier des charges.",
    salaries: {
      nombreSalariesSiege: 5,
      personnelAdministratif: 1,
      personnelProduction: 0,
      nombreTotalSalaries: 8,
      presenceCSE: false,
      ressourcesRSE: 0.5
    },
    labellisations: {
      biologique: true,
      labellisationQSE: "",
      labellisationRSE: "",
      labellisationEquitable: ""
    },
    auditSouhaite: {
      moisAudit: "déc.-25",
      organismeEvaluateur: "SGS"
    },
    eligibilite: {
      eligiblePME: true,
      adherentFEEF: true,
      fournisseurGD: true,
      pratiquesEthiques: true,
      estEligible: true,
      dateValidation: "10/8/2025",
      signataire: {
        nom: "BARROIS",
        prenom: "Katrin"
      }
    },
    workflow: {
      state : labelingCaseState.candidacy,
      type : lebelingCaseType.initial,
      partageOE: "SGS",
      alerts: [
        {
          id: 'alpha-missing-doc',
          type: 'warning',
          description: 'Il manque 3 documents pour la revue documentaire. Date limite: 20/11/2025',
          icon: 'i-lucide-file-x',
          dismissible: true
        },
        {
          id: 'alpha-audit-date',
          type: 'info',
          description: 'Votre audit est programmé pour le 10 septembre 2025. L\'auditeur vous contactera prochainement.',
          icon: 'i-lucide-calendar-check',
          dismissible: true
        }
      ],
      contratLabellisation: {
        envoiContrat: "1/8/2025",
        contratSigne: "10/8/2025"
      },
      contratOE: {
        contratSigne: "20/8/2025",
        signePar: "Jean Paul (Directeur Général)"
      },
      audit: {
        type: "Initial",
        dateDebutPlanifiee: "10/9/2025",
        dateFinPlanifiee: "10/9/2025",
        auditeur: {
          nom: "MrX",
          prenom: "jean"
        },
        dateTransmissionPlan: "25/8/2025",
        revueDocumentaire: {
          dateTransmission: "25/8/2025",
          datePartage: "1/9/2025",
          documentsManquants: 3
        },
        dateDebutReelle: "10/9/2025",
        dateFinReelle: "10/9/2025"
      },
      rapport: {
        performanceGlobale: 62,
        rapport: {
          dateTransmission: "15/9/2025",
          isAvailable: true
        },
        planAction: {
          requis: true,
          dateTransmission: "25/9/2025",
          isAvailable: true,
          valideParOE: true,
          dateValidation: "28/9/2025"
        }
      },
      avis: {
        dateTransmission: "30/9/2025",
        avis: "en_cours",
        performanceGlobale: 58,
        absencePointsBloquants: false,
        argumentaire: "L'entreprise Alpha présente une performance de 58%, en dessous du seuil requis. Plusieurs points bloquants ont été identifiés, notamment dans la gouvernance et la transparence. Un plan d'action corrective complet a été transmis et validé par l'OE. L'avis final sera rendu après vérification de la mise en œuvre effective des mesures correctives proposées.",
        avisLabellisation: {
          isAvailable: false
        }
      },
      attestation: {}
    }
  },
  {
    id: "beta",
    raisonSociale: {
      nom: "Beta",
      siren: "XXXXXXXXXXXXX2",
      adresse: "Rue de l'église",
      cp: "61700",
      ville: "Lonlay-L'Abbaye",
      region: "Normandie",
      telephone: "02 03 04 06 55"
    },
    pilote: {
      nom: "LECLERC",
      prenom: "Charles",
      fonction: "Responsable QHSE",
      telephone: "02 03 04 06 55",
      portable: "06 45 64 56 56",
      email: "charlesleclerc@beta.com"
    },
    dirigeant: {
      nom: "PIERRE",
      prenom: "Philippe",
      fonction: "Président",
      telephone: "02 03 04 06 55",
      portable: "06 45 64 56 59",
      email: "philippepierre@beta.com"
    },
    comptabilite: {
      nom: "COMPTES",
      prenom: "Paul",
      fonction: "Assistante administrative",
      telephone: "02 03 04 06 50",
      email: "comptabilité@beta.com"
    },
    appartenanceGroupe: {
      appartientGroupe: false
    },
    sites: {
      nombreSites: 6
    },
    activites: {
      productionPropre: true,
      productionSousTraitance: false,
      conditionnementPropre: false,
      conditionnementSousTraitance: true,
      logistiquePropre: false,
      logistiqueSousTraitance: true,
      exclusionActivites: false
    },
    sousTraitance: {
      nature: "Production de cidres",
      partCATotale: 13,
      partCAFrance: 13,
      partCAEurope: 0,
      partCAHorsEurope: 0
    },
    negoce: {
      partCATotale: 0,
      partCAFrance: 0,
      partCAEurope: 0,
      partCAHorsEurope: 0
    },
    produits: {
      partVolumeAlimentaires: 100,
      partVolumeNonAlimentaires: 0,
      natureProduits: "Production et commercialisation de cidres",
      nombreGammes: 5,
      marques: "Marque Beta et Beta Premium"
    },
    perimetreLabellisation: "",
    salaries: {
      nombreSalariesSiege: 20,
      personnelAdministratif: 12,
      personnelProduction: 125,
      nombreTotalSalaries: 160,
      presenceCSE: true,
      ressourcesRSE: 0
    },
    labellisations: {
      biologique: false,
      labellisationQSE: "IFS"
    },
    auditSouhaite: {
      moisAudit: "",
      organismeEvaluateur: "Ecocert"
    },
    eligibilite: {
      eligiblePME: true,
      adherentFEEF: true,
      fournisseurGD: true,
      pratiquesEthiques: true,
      estEligible: true,
      dateValidation: "20/1/2025",
      signataire: {
        nom: "BARROIS",
        prenom: "Katrin"
      }
    },
    workflow: {
      state : labelingCaseState.audit,
      type : lebelingCaseType.renouvellement,
      partageOE: "Ecocert",
      alerts: [
        {
          id: 'beta-plan-action',
          type: 'warning',
          description: 'Un plan d\'action corrective doit être transmis avant le 15/04/2025 suite au rapport d\'audit.',
          icon: 'i-lucide-alert-triangle',
          dismissible: false
        }
      ],
      contratLabellisation: {
        envoiContrat: "3/1/2025",
        contratSigne: "20/1/2025"
      },
      contratOE: {
        contratSigne: "15/2/2025",
        signePar: "Marie Dubois (Directrice Administrative)"
      },
      audit: {
        type: "renouvellement",
        dateDebutPlanifiee: "1/3/2025",
        dateFinPlanifiee: "2/3/2025",
        auditeur: {
          nom: "MrZ",
          prenom: "Paul"
        },
        dateTransmissionPlan: "25/2/2025",
        revueDocumentaire: {
          dateTransmission: "26/2/2025",
          datePartage: "28/2/2025"
        },
        dateDebutReelle: "5/3/2025",
        dateFinReelle: "6/3/2025"
      },
      rapport: {
        dateTransmission: "2/4/2025",
        performanceGlobale: 55,
        planAction: {
          requis: true,
          dateLimiteDepot: "15/4/2025", 
          isAvailable: false
        }
      },
      avis: {
        dateTransmission: "5/4/2025",
        avis: "favorable",
        decision: "accordé",
        argumentaire: "L'entreprise Beta démontre un fort engagement en matière de RSE avec une performance globale satisfaisante de 75%. Malgré un score en dessous du seuil d'excellence, les mesures correctives mises en place témoignent d'une démarche d'amélioration continue. L'absence de points bloquants et la collaboration active durant l'audit justifient un avis favorable.",
        performanceGlobale: 75,
        absencePointsBloquants: true,
        avisLabellisation: {
          dateTransmission: "6/4/2025",
          isAvailable: true
        },
        decisionFEEF: {
          statut: "accepte",
          dateDecision: "8/4/2025",
          validePar: "Katrin BARROIS - Directrice FEEF"
        }
      },
      attestation: {
        dateTransmission: "8/4/2025",
        dateValidite: "8/4/2028",
        signatureFEEF: {
          dateSigned: "8/4/2025",
          signePar: "Katrin BARROIS - Directrice FEEF",
          isGenerated: true
        },
        signatureEntreprise: {
          dateSigned: "10/4/2025",
          signePar: "Philippe PIERRE - Président",
          isConfirmed: true
        }
      }
    }
  },
  {
    id: "omega",
    raisonSociale: {
      nom: "Omega",
      siren: "XXXXXXXXXXXXX3",
      adresse: "Rue de la Mairie",
      cp: "69007",
      ville: "Lyon",
      region: "Auvergne Rhône-Alpes",
      telephone: "05 06 07 08 99"
    },
    pilote: {
      nom: "ALONSO",
      prenom: "Fernando",
      fonction: "Directeur RSE",
      telephone: "05 06 07 08 99",
      portable: "06 65 46 54 54",
      email: "falfonso@omega.com"
    },
    dirigeant: {
      nom: "JACQUES",
      prenom: "Paul",
      fonction: "PDG",
      telephone: "05 06 07 08 99",
      portable: "06 65 46 54 55",
      email: "pjacques@omega.com"
    },
    comptabilite: {
      nom: "BALANCE",
      prenom: "Michel",
      fonction: "Directeur comptable",
      telephone: "05 06 07 08 95",
      email: "comptabilité@omega.com"
    },
    appartenanceGroupe: {
      appartientGroupe: true,
      nomGroupe: "Omega",
      structuresLabellisees: ["Zeta", "Theta"],
      structuresEnCoursLabellisation: ["Beta"],
      wantEngageALLGroupe: "Oui d'ici quelques années"
    },
    sites: {
      nombreSites: 3
    },
    activites: {
      productionPropre: true,
      productionSousTraitance: true,
      conditionnementPropre: false,
      conditionnementSousTraitance: true,
      logistiquePropre: false,
      logistiqueSousTraitance: true,
      exclusionActivites: false
    },
    sousTraitance: {
      nature: "Transformation et commercialisation de denrées alimentaires",
      partCATotale: 43,
      partCAFrance: 14,
      partCAEurope: 86,
      partCAHorsEurope: 0.1
    },
    negoce: {
      nature: "oui",
      partCATotale: 25,
      partCAFrance: 13,
      partCAEurope: 12,
      partCAHorsEurope: 0
    },
    produits: {
      partVolumeAlimentaires: 100,
      partVolumeNonAlimentaires: 0,
      natureProduits: "Transformation et commercialisation de denrées alimentaires snacking asiatiques",
      nombreGammes: 12,
      marques: "Marque Omega, Zeta, Snck'Omega"
    },
    perimetreLabellisation: "",
    salaries: {
      nombreSalariesSiege: 102,
      personnelAdministratif: 102,
      personnelProduction: 137,
      nombreTotalSalaries: 239,
      presenceCSE: true,
      ressourcesRSE: 2
    },
    labellisations: {
      biologique: false,
      labellisationQSE: "IFS"
    },
    auditSouhaite: {
      moisAudit: "",
      organismeEvaluateur: "Ecocert"
    },
    eligibilite: {
      eligiblePME: true,
      adherentFEEF: true,
      fournisseurGD: true,
      pratiquesEthiques: true,
      estEligible: true,
      dateValidation: "20/12/2024",
      signataire: {
        nom: "BARROIS",
        prenom: "Katrin"
      }
    },
    workflow: {
      state : labelingCaseState.engagement,
      type : lebelingCaseType.renouvellement,
      partageOE: "Ecocert",
      alerts: [
        {
          id: 'omega-validation-feef',
          type: 'warning',
          description: 'Le dossier est en attente de validation par la direction FEEF. Un retard pourrait impacter le planning.',
          icon: 'i-lucide-clock',
          dismissible: true
        },
        {
          id: 'omega-performance',
          type: 'success',
          description: 'Performance de 87% obtenue lors de l\'audit - félicitations pour cette excellente démarche RSE!',
          icon: 'i-lucide-trophy',
          dismissible: true
        }
      ],
      contratLabellisation: {
        envoiContrat: "30/11/2024",
        contratSigne: "20/12/2024"
      },
      contratOE: {
        contratSigne: "5/1/2025",
        signePar: "Sophie Martin (PDG)"
      },
      audit: {
        type: "renouvellement",
        dateDebutPlanifiee: "4/2/2025",
        dateFinPlanifiee: "4/2/2025",
        auditeur: {
          nom: "MmeJ",
          prenom: "Françoise"
        },
        dateTransmissionPlan: "15/1/2025",
        revueDocumentaire: {
          dateTransmission: "15/1/2025",
          datePartage: "29/02/2025"
        },
        dateDebutReelle: "4/2/2025",
        dateFinReelle: "4/2/2025"
      },
      rapport: {
        dateTransmission: "28/2/2025",
        performanceGlobale: 87
      },
      avis: {
        dateTransmission: "1/3/2025",
        avis: "favorable",
        decision: "accordé",
        argumentaire: "Omega présente une excellente performance avec un score de 87%, dépassant largement le seuil d'excellence de 80%. L'entreprise fait preuve d'un engagement exemplaire en matière de RSE, avec des pratiques bien établies et une démarche d'amélioration continue. L'absence totale de points bloquants et la maturité de l'organisation justifient pleinement cet avis favorable et l'octroi du label.",
        performanceGlobale: 87,
        absencePointsBloquants: true,
        avisLabellisation: {
          dateTransmission: "2/3/2025",
          isAvailable: true
        },
        decisionFEEF: {
          statut: "en_attente"
        }
      },
      attestation: {
        dateTransmission: "8/3/2025",
        dateValidite: "8/3/2028",
        signatureFEEF: {
          isGenerated: false
        },
        signatureEntreprise: {
          isConfirmed: false
        }
      }
    }
  },
  {
    id: "zeta",
    raisonSociale: {
      nom: "Zeta",
      siren: "XXXXXXXXXXXXX4",
      adresse: "Rue des Champs",
      cp: "83600",
      ville: "Fréjus",
      region: "Provence-Alpes-Côte d'Azur",
      telephone: "04 05 06 07 88"
    },
    pilote: {
      nom: "GASLY",
      prenom: "Pierre",
      fonction: "Responsable RSE",
      telephone: "04 05 06 07 88",
      portable: "06 78 97 89 89",
      email: "pgasly@zeta.fr"
    },
    dirigeant: {
      nom: "MICHEL",
      prenom: "Yves",
      fonction: "Fondateur",
      telephone: "04 05 06 07 88",
      portable: "06 78 97 89 90",
      email: "ymichel@zeta.fr"
    },
    comptabilite: {
      nom: "AFFAIRES",
      prenom: "Jacques",
      fonction: "Comptable",
      telephone: "04 05 06 07 85",
      email: "comptabilité@zeta.fr"
    },
    appartenanceGroupe: {
      appartientGroupe: true,
      nomGroupe: "Omega"
    },
    sites: {
      nombreSites: 1
    },
    activites: {
      productionPropre: true,
      productionSousTraitance: false,
      conditionnementPropre: true,
      conditionnementSousTraitance: false,
      logistiquePropre: true,
      logistiqueSousTraitance: true,
      exclusionActivites: false
    },
    sousTraitance: {
      nature: "Fabrication des serviettes en papier",
      partCATotale: 30,
      partCAFrance: 30,
      partCAEurope: 30,
      partCAHorsEurope: 0
    },
    negoce: {
      partCATotale: 0,
      partCAFrance: 0,
      partCAEurope: 0,
      partCAHorsEurope: 0
    },
    produits: {
      partVolumeAlimentaires: 0,
      partVolumeNonAlimentaires: 100,
      natureProduits: "Fabrication, transformation de kit couvertsen plastique",
      nombreGammes: 1,
      marques: "Zeta pack"
    },
    perimetreLabellisation: "Fabrication, transformation de kit couvertsen plastique sur le site de Fréjus",
    salaries: {
      nombreSalariesSiege: 3,
      personnelAdministratif: 2,
      personnelProduction: 15,
      nombreTotalSalaries: 18,
      presenceCSE: false,
      ressourcesRSE: 0.25
    },
    labellisations: {
      biologique: false,
      labellisationQSE: "ISO9001",
      labellisationRSE: "ISO9001 / ISO 14001 / BRC /IFS",
      labellisationEquitable: "BioED / Bretagne 26000 / B-Corp"
    },
    auditSouhaite: {
      moisAudit: "",
      organismeEvaluateur: "Ecocert"
    },
    eligibilite: {
      eligiblePME: true,
      adherentFEEF: true,
      fournisseurGD: true,
      pratiquesEthiques: true,
      estEligible: true,
      dateValidation: "11/11/2024",
      signataire: {
        nom: "BARROIS",
        prenom: "Katrin"
      }
    },
    workflow: {
      state : labelingCaseState.audit,
      type : lebelingCaseType.initial,
      partageOE: "Ecocert",
      alerts: [
        {
          id: 'zeta-plan-validation',
          type: 'info',
          description: 'Votre plan d\'action corrective a été transmis et est en cours de validation par l\'organisme évaluateur.',
          icon: 'i-lucide-file-check',
          dismissible: true
        },
        {
          id: 'zeta-next-steps',
          type: 'info',  
          description: 'Suite à la validation du plan d\'action, l\'avis final sera émis sous 5 jours ouvrés.',
          icon: 'i-lucide-arrow-right',
          dismissible: true
        }
      ],
      contratLabellisation: {
        envoiContrat: "4/11/2024",
        contratSigne: "11/11/2024"
      },
      contratOE: {
        contratSigne: "30/11/2024",
        signePar: "Laurent Rousseau (Directeur Général)"
      },
      audit: {
        type: "documentaire",
        dateDebutPlanifiee: "15/1/2025",
        dateFinPlanifiee: "15/1/2025",
        auditeur: {
          nom: "MrX",
          prenom: "Jean"
        },
        dateTransmissionPlan: "",
        revueDocumentaire: {
          dateTransmission: "5/1/2025",
          datePartage: "12/1/2025"
        },
        dateDebutReelle: "15/1/2025",
        dateFinReelle: "15/1/2025"
      },
      rapport: {
        dateTransmission: "31/1/2025",
        performanceGlobale: 60,
        planAction: {
          requis: true,
          dateTransmission: "20/2/2025",
          isAvailable: true,
          valideParOE: false
        }
      },
      avis: {
        dateTransmission: "2/2/2025",
        avis: "favorable", 
        decision: "accordé",
        argumentaire: "Zeta montre une performance de 60%, nécessitant un plan d'action corrective qui a été transmis et validé par l'organisme évaluateur. L'entreprise a démontré sa capacité à identifier les axes d'amélioration et à mettre en place des mesures concrètes. Malgré un score initial en dessous du seuil, l'engagement manifesté et l'absence de points bloquants permettent d'envisager favorablement l'attribution du label sous réserve de la mise en œuvre effective du plan d'action.",
        performanceGlobale: 60,
        absencePointsBloquants: true,
        avisLabellisation: {
          dateTransmission: "3/2/2025",
          isAvailable: true
        }
      },
      attestation: {
        dateTransmission: "2/2/2025",
        dateValidite: "10/2/2025"
      }
    }
  }
]

export function getCompanyById(id: string): Company | undefined {
  return COMPANIES.find((company) => company.id === id)
}

export function getOEById(id: string): OE | undefined {
  return ORGANISMES_EVALUATEURS.find((oe) => oe.id === id)
}

export interface Documents {
  id: string
  name: string
  description: string
  labelingCaseState: string
  isAvailable: boolean
  dateUpload?: string
  uploadedBy?: string
  fileSize?: string
  fileType?: string
  dateLimiteDepot?: string
}

export const DOCUMENTS: Documents[] = [
  { 
    id: "doc1", 
    name: "Charte RSE", 
    description: "Document décrivant les engagements RSE de l'entreprise", 
    labelingCaseState: labelingCaseState.candidacy,
    isAvailable: true,
    dateUpload: "15/07/2025",
    uploadedBy: "Jean Paul (Directeur Général)",
    fileSize: "2.3 MB",
    fileType: "PDF"
  },
  { 
    id: "contrat-labellisation", 
    name: "Devis Organisme Évaluateur", 
    description: "Devis officiel établi par l'Organisme Évaluateur pour la labellisation", 
    labelingCaseState: labelingCaseState.candidacy,
    isAvailable: false,
    dateLimiteDepot: "30/07/2025"
  },
  { 
    id: "doc2", 
    name: "Politique environnementale", 
    description: "Document détaillant les actions environnementales mises en place", 
    labelingCaseState: labelingCaseState.candidacy,
    isAvailable: true,
    dateUpload: "18/07/2025",
    uploadedBy: "Lewis Hamilton (Responsable Qualité)",
    fileSize: "1.8 MB",
    fileType: "PDF"
  },
  { 
    id: "doc3", 
    name: "Rapport d'audit interne", 
    description: "Rapport d'audit interne réalisé avant la candidature", 
    labelingCaseState: labelingCaseState.candidacy,
    isAvailable: false,
    dateLimiteDepot: "30/09/2025"
  },
  { 
    id: "doc5", 
    name: "Plan d'action RSE", 
    description: "Plan détaillant les actions RSE prévues pour l'année à venir", 
    labelingCaseState: labelingCaseState.audit,
    isAvailable: false,
    dateLimiteDepot: "15/10/2025"
  },
  { 
    id: "doc6", 
    name: "Contrat de labellisation", 
    description: "Contrat signé entre l'entreprise et l'organisme de labellisation", 
    labelingCaseState: labelingCaseState.candidacy,
    isAvailable: true,
    dateUpload: "01/08/2025",
    uploadedBy: "FEEF - Service Labellisation",
    fileSize: "3.2 MB",
    fileType: "PDF"
  },
  { 
    id: "plan-audit", 
    name: "Plan d'audit", 
    description: "Plan d'audit établi par l'Organisme Évaluateur incluant programme et méthologie", 
    labelingCaseState: labelingCaseState.audit,
    isAvailable: true,
    dateUpload: "25/08/2025",
    uploadedBy: "Organisme Évaluateur - Auditeur principal",
    fileSize: "2.8 MB",
    fileType: "PDF"
  },
  { 
    id: "rapport-audit-simplifie", 
    name: "Rapport d'audit", 
    description: "Synthèse des résultats d'audit avec les principales conclusions", 
    labelingCaseState: labelingCaseState.decision,
    isAvailable: true,
    dateUpload: "15/09/2025",
    uploadedBy: "Organisme Évaluateur - Auditeur principal",
    fileSize: "1.5 MB",
    fileType: "PDF"
  },
  { 
    id: "plan-action", 
    name: "Plan d'action corrective", 
    description: "Plan d'action détaillant les mesures correctives suite au rapport d'audit", 
    labelingCaseState: labelingCaseState.decision,
    isAvailable: true,
    dateUpload: "10/02/2025",
    uploadedBy: "Entreprise - Direction Générale",
    fileSize: "2.1 MB",
    fileType: "PDF"
  },
  { 
    id: "attestation-labellisation", 
    name: "Attestation de labellisation", 
    description: "Attestation officielle de labellisation FEEF avec signatures", 
    labelingCaseState: labelingCaseState.decision,
    isAvailable: true,
    dateUpload: "8/4/2025",
    uploadedBy: "FEEF - Service Labellisation",
    fileSize: "1.9 MB",
    fileType: "PDF"
  }
]

export const ORGANISMES_EVALUATEURS: OE[] = [
  {
    id: 'sgs',
    nom: 'SGS',
    accounts: [
      {
        prenom: 'Sophie',
        nom: 'MARTIN',
        email: 'sophie.martin@sgs.com',
        role: accountRole.administrateur
      },
      {
        prenom: 'Jean',
        nom: 'DUPONT',
        email: 'jean.dupont@sgs.com',
        role: accountRole.chargeAffaire
      },
      {
        prenom: 'Marie',
        nom: 'BERNARD',
        email: 'marie.bernard@sgs.com',
        role: accountRole.chargeAffaire
      }
    ]
  },
  {
    id: 'ecocert',
    nom: 'Ecocert',
    accounts: [
      {
        prenom: 'Jean-Pierre',
        nom: 'DUBOIS',
        email: 'jean-pierre.dubois@ecocert.com',
        role: accountRole.administrateur
      },
      {
        prenom: 'Catherine',
        nom: 'LEROY',
        email: 'catherine.leroy@ecocert.com',
        role: accountRole.chargeAffaire
      },
      {
        prenom: 'Philippe',
        nom: 'ROUSSEAU',
        email: 'philippe.rousseau@ecocert.com',
        role: accountRole.chargeAffaire
      },
      {
        prenom: 'Anne',
        nom: 'MOREAU',
        email: 'anne.moreau@ecocert.com',
        role: accountRole.chargeAffaire
      }
    ]
  }
]