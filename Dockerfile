# syntax=docker/dockerfile:1
ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage: fetch dependencies (no source)
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./ 
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm fetch --prod --filter @abe-stack/server

# Stage: build server
FROM base AS build
WORKDIR /app
COPY --from=deps /pnpm /pnpm
COPY . .
RUN pnpm install --offline --prod --filter @abe-stack/server && \
    pnpm --filter @abe-stack/server build && \
    pnpm --filter @abe-stack/server deploy --prod /app/server-deploy

# Stage: runtime image
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/server-deploy/ .
CMD ["node", "dist/index.js"]
