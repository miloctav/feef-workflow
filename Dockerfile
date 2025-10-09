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
    ls -la .output || echo "No .output directory found"

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Copy only the built output
COPY --from=build /app/.output ./

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "/app/server/index.mjs"]
