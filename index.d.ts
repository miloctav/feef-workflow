declare module 'nuxt/schema' {
  interface RuntimeConfig {
    // Database
    databaseUrl: string

    // Garage (S3-compatible object storage)
    garage: {
      endpoint: string
      region: string
      accessKey: string
      secretKey: string
      bucket: string
    }

    // Security & Authentication
    jwtSecret: string
    seedToken: string

    // Email (Resend)
    resend: {
      apiKey: string
      fromEmail: string
    }

    // Development mode
    devMode: boolean
  }

  interface PublicRuntimeConfig {
    // Aucune variable publique pour le moment
  }
}

// It is always important to ensure you import/export something when augmenting a type
export {}
