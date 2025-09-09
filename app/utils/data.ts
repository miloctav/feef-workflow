// utils/data.ts

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
    state : keyof typeof labelingCaseState,
    type : keyof typeof lebelingCaseType,
    partageOE: string
    contratLabellisation: {
      envoiContrat: string
      contratSigne: string
    }
    contratOE: {
      contratSigne: string
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
      }
      dateDebutReelle: string
      dateFinReelle: string
    }
    rapport: {
      dateTransmission?: string
      performanceGlobale?: number
    }
    avis: {
      dateTransmission?: string
      avis?: string
      performanceGlobale?: number
      absencePointsBloquants?: boolean
    }
    attestation: {
      dateTransmission?: string
      dateValidite?: string
    }
  }
}

export const labelingCaseState = {
  candidacy : "CANDIDATURE",
  engagement : "ENGAGEMENT",
  audit : "AUDIT",
  decision : "DECISION",
  labeled : "LABELISE"
}

export const lebelingCaseType = {
  initial : "Initial",
  renouvellement : "Renouvellement",
}

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
      contratLabellisation: {
        envoiContrat: "1/8/2025",
        contratSigne: "10/8/2025"
      },
      contratOE: {
        contratSigne: "20/8/2025"
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
          datePartage: "1/9/2025"
        },
        dateDebutReelle: "10/9/2025",
        dateFinReelle: "10/9/2025"
      },
      rapport: {},
      avis: {},
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
      contratLabellisation: {
        envoiContrat: "3/1/2025",
        contratSigne: "20/1/2025"
      },
      contratOE: {
        contratSigne: "15/2/2025"
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
        performanceGlobale: 75
      },
      avis: {
        dateTransmission: "5/4/2025",
        avis: "favorable",
        performanceGlobale: 75,
        absencePointsBloquants: true
      },
      attestation: {
        dateTransmission: "7/4/2025",
        dateValidite: "5/4/2025"
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
      contratLabellisation: {
        envoiContrat: "30/11/2024",
        contratSigne: "20/12/2024"
      },
      contratOE: {
        contratSigne: "5/1/2025"
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
        performanceGlobale: 87,
        absencePointsBloquants: true
      },
      attestation: {
        dateTransmission: "8/3/2025",
        dateValidite: "1/3/2025"
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
      contratLabellisation: {
        envoiContrat: "4/11/2024",
        contratSigne: "11/11/2024"
      },
      contratOE: {
        contratSigne: "30/11/2024"
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
        performanceGlobale: 68
      },
      avis: {
        dateTransmission: "2/2/2025",
        avis: "favorable",
        performanceGlobale: 68,
        absencePointsBloquants: true
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
