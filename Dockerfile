# Dockerfile for Nuxt 4 Application
# Based on official Nuxt recommendations

# Build Stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY . ./

# Build the application
RUN npm run build && \
    echo "=== Build output structure ===" && \
    ls -la && \
    echo "=== .output directory ===" && \
    ls -la .output || echo "No .output directory found" && \
    echo "=== Checking for server entry point ===" && \
    if [ ! -f ".output/server/index.mjs" ]; then \
        echo "ERROR: Build failed - .output/server/index.mjs not found" && \
        echo "This usually means the Nuxt build process failed." && \
        echo "Check the build logs above for errors." && \
        exit 1; \
    fi && \
    echo "✓ Build successful - server entry point found"

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Copy package files and install production dependencies (including tsx)
COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev

# Copy only the built output
COPY --from=build /app/.output ./

# Copy migration files (needed for runtime execution)
COPY --from=build /app/server/database/migrations ./server/database/migrations

# Copy TypeScript source files needed for migration scripts
COPY --from=build /app/server/database/migrate.ts ./server/database/migrate.ts
COPY --from=build /app/server/database/init-storage.ts ./server/database/init-storage.ts
COPY --from=build /app/server/database/schema.ts ./server/database/schema.ts
COPY --from=build /app/server/database/index.ts ./server/database/index.ts
COPY --from=build /app/server/services/minio.ts ./server/services/minio.ts
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

# Create symlink so tsx can resolve modules from server directory
RUN ln -s /app/node_modules /app/server/node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Make entrypoint script executable
RUN chmod +x /docker-entrypoint.sh

# Verify the copy succeeded
RUN if [ ! -f "server/index.mjs" ]; then \
        echo "ERROR: server/index.mjs not found after copy" && \
        echo "Build output may be incomplete" && \
        exit 1; \
    fi && \
    echo "✓ Application files copied successfully"

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Use entrypoint script to run migrations and start the application
ENTRYPOINT ["/docker-entrypoint.sh"]
