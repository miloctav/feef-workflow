// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    }
  ],
  runtimeConfig: {
    // Variables privées (server-side uniquement)
    // Nuxt récupère automatiquement les variables d'environnement avec le préfixe NUXT_

    // Database
    databaseUrl: '',

    // Garage (S3-compatible object storage)
    garage: {
      endpoint: '',
      region: '',
      accessKey: '',
      secretKey: '',
      bucket: '',
    },

    // Security & Authentication
    jwtSecret: '',
    seedToken: '',

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