# Dockerfile for Nuxt 4 Application
# Based on official Nuxt recommendations

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment to production for build
ENV NODE_ENV=production

# Run postinstall to prepare Nuxt
RUN npm run postinstall

# Build the application
RUN npm run build

# Debug: Check what was generated
RUN echo "=== Checking build output ===" && \
    ls -la /app/ && \
    echo "=== Looking for .output ===" && \
    find /app -name ".output" -type d || echo "No .output found" && \
    echo "=== Looking for .nuxt ===" && \
    find /app -name ".nuxt" -type d || echo "No .nuxt found"

# Production image, copy all the files and run nuxt
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# Copy built application
COPY --from=builder --chown=nuxtjs:nodejs /app/.output /app/.output

USER nuxtjs

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", ".output/server/index.mjs"]
