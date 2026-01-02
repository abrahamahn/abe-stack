# syntax=docker/dockerfile:1
ARG NODE_VERSION=20

# =============================================================================
# Base Stage - Common dependencies and configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Enable pnpm via corepack
ENV PNPM_HOME=/pnpm
ENV PNPM_STORE_PATH=/pnpm/store
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN mkdir -p /pnpm/store

WORKDIR /app

# =============================================================================
# Dependencies Stage - Fetch and cache dependencies
# =============================================================================
FROM base AS deps

# Copy only package files for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages/db/package.json packages/db/
COPY packages/api-client/package.json packages/api-client/

# Fetch production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch --prod

# =============================================================================
# Build Stage - Compile TypeScript and prepare deployment
# =============================================================================
FROM base AS build

WORKDIR /app

# Copy cached pnpm store from deps stage
COPY --from=deps /pnpm/store /pnpm/store

# Copy all source files
COPY . .

# Install dependencies, build, and deploy to clean directory
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile && \
    pnpm --filter @abe-stack/db build && \
    pnpm --filter @abe-stack/shared build && \
    pnpm --filter @abe-stack/server build && \
    pnpm --filter @abe-stack/server deploy --prod --legacy /app/server-deploy

# =============================================================================
# Production Stage - Minimal runtime image with security hardening
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

# Install security updates and dumb-init for proper signal handling
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/server-deploy/ .

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
