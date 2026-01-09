// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],

  // Charger Google Fonts via le head HTML pour éviter @nuxt/fonts
  app: {
    head: {
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap'
        }
      ]
    }
  },

  // Exclure les routes de stockage du routeur client (pour qu'elles soient gérées par le serveur/Nginx)
  router: {
    options: {
      scrollBehaviorType: 'smooth'
    }
  },

  routeRules: {
    '/feef-storage/**': { headers: { 'Cache-Control': 'no-cache' } } // Indication pour Nitro, mais ne suffit pas pour le client
  },

  // Désactiver @nuxt/fonts pour éviter les erreurs réseau pendant le build Docker
  fonts: {
    enabled: false,
    // Désactiver complètement les optimisations de polices
    experimental: {
      processCSSVariables: false
    }
  },

  // Configuration Nuxt UI pour ne pas utiliser @nuxt/fonts
  ui: {
    fonts: false
  },

  css: ['~/assets/css/main.css'],
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    }
  ],
  nitro: {
    experimental: {
      tasks: true
    },
    scheduledTasks: {
      // S'exécute à 0h UTC = 1h Paris (hiver) / 2h Paris (été)
      '0 0 * * *': ['audits:update-status'],
      // S'exécute à 2h40 UTC = 3h40 Paris (hiver) / 4h40 Paris (été)
      '40 2 * * *': ['actions:check-label-expiration'],
    }
  },
  runtimeConfig: {
    // Variables privées (server-side uniquement)
    // Nuxt récupère automatiquement les variables d'environnement avec le préfixe NUXT_

    // Database
    databaseUrl: '',

    // Garage (S3-compatible object storage)
    garage: {
      endpoint: '', // Endpoint interne (uploads)
      publicEndpoint: '', // Endpoint public (signed URLs)
      region: '',
      accessKey: '',
      secretKey: '',
      bucket: '',
    },

    // Security & Authentication
    jwtSecret: '',
    seedToken: '',

    // Session configuration
    session: {
      maxAge: 60 * 60 * 24, // 1 day
    },

    // Email (Resend)
    resend: {
      apiKey: '',
      fromEmail: '',
    },

    // Development mode
    devMode: false,

    // Variables publiques (accessibles côté client)
    public: {
      // Aucune variable publique pour le moment
      // Toutes les variables sont utilisées côté serveur uniquement
    }
  }
})