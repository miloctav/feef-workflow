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

    // Database
    databaseUrl: process.env.DATABASE_URL || '',

    // Garage (S3-compatible object storage)
    garage: {
      endpoint: process.env.GARAGE_ENDPOINT || '',
      region: process.env.GARAGE_REGION || '',
      accessKey: process.env.GARAGE_ACCESS_KEY || '',
      secretKey: process.env.GARAGE_SECRET_KEY || '',
      bucket: process.env.GARAGE_BUCKET || '',
    },

    // Security & Authentication
    jwtSecret: process.env.JWT_SECRET || '',
    seedToken: process.env.NUXT_SEED_TOKEN || '',

    // Email (Resend)
    resend: {
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: process.env.RESEND_FROM_EMAIL || '',
    },

    // Development mode
    devMode: process.env.DEV_MODE === 'true',

    // Variables publiques (accessibles côté client)
    public: {
      // Aucune variable publique pour le moment
      // Toutes les variables sont utilisées côté serveur uniquement
    }
  }
})