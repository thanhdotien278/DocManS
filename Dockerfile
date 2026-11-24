# Multi-stage production Dockerfile for DocManS (api + web)
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY packages ./packages
COPY apps/api/prisma ./apps/api/prisma

RUN npm ci

# ---- Build API ----
FROM deps AS builder-api
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN npm run build:api

# ---- Production API ----
FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder-api /app/node_modules ./node_modules
COPY --from=builder-api /app/package.json ./package.json
COPY --from=builder-api /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder-api /app/packages ./packages
COPY --from=builder-api /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder-api /app/dist/apps/api ./dist/apps/api

EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:deploy && node dist/apps/api/main.js"]

# ---- Build Web ----
FROM deps AS builder-web
ARG NEXT_PUBLIC_APP_NAME=RTMS
ARG NEXT_PUBLIC_API_BASE_URL=https://khqs.thanhdotien.com/api/v1
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY tsconfig.base.json ./
COPY apps/web ./apps/web
RUN npm run build:web

# ---- Production Web ----
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder-web /app/node_modules ./node_modules
COPY --from=builder-web /app/package.json ./package.json
COPY --from=builder-web /app/packages ./packages
COPY --from=builder-web /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder-web /app/apps/web/public ./apps/web/public
COPY --from=builder-web /app/apps/web/.next ./apps/web/.next

EXPOSE 3000
CMD ["npx", "next", "start", "apps/web", "-H", "0.0.0.0", "-p", "3000"]
