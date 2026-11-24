# Multi-stage production Dockerfile for DocManS (api + web)
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY packages ./packages
COPY apps/api/prisma ./apps/api/prisma

RUN npm ci --ignore-scripts

# ---- Build API ----
FROM deps AS builder-api
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN npm run build:api && npm prune --omit=dev --ignore-scripts

# ---- Production API ----
FROM node:24-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder-api --chown=node:node /app/node_modules ./node_modules
COPY --from=builder-api --chown=node:node /app/package.json ./package.json
COPY --from=builder-api --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder-api --chown=node:node /app/packages ./packages
COPY --from=builder-api --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder-api --chown=node:node /app/dist/apps/api ./dist/apps/api

USER node
EXPOSE 4000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma && node dist/apps/api/main.js"]

# ---- Build Web ----
FROM deps AS builder-web
ARG NEXT_PUBLIC_APP_NAME=RTMS
ARG NEXT_PUBLIC_API_BASE_URL=https://docmans.example.org/api/v1
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY tsconfig.base.json ./
COPY apps/web ./apps/web
RUN npm run build:web && npm prune --omit=dev --ignore-scripts

# ---- Production Web ----
FROM node:24-alpine AS web
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder-web --chown=node:node /app/node_modules ./node_modules
COPY --from=builder-web --chown=node:node /app/package.json ./package.json
COPY --from=builder-web --chown=node:node /app/packages ./packages
COPY --from=builder-web --chown=node:node /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder-web --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=builder-web --chown=node:node /app/apps/web/.next ./apps/web/.next

USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "apps/web", "-H", "0.0.0.0", "-p", "3000"]
