# --- Build stage ---
FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and all package.json files first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY patches ./patches
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @sanakenno/web build

# --- Runtime stage ---
FROM node:22-alpine AS runtime

RUN apk add --no-cache python3 make g++ tzdata
RUN corepack enable && corepack prepare pnpm@latest --activate

RUN addgroup -S sanakenno && adduser -S sanakenno -G sanakenno

WORKDIR /app

# Copy workspace config and root + server package.json for production deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY patches ./patches
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile && apk del python3 make g++

# Copy built frontend
COPY --from=build /app/packages/web/dist ./dist

# Copy shared package source (needed at runtime for server imports)
COPY packages/shared ./packages/shared

# Copy server source and admin scripts (executed via pinned workspace tsx at runtime)
COPY server ./server
COPY scripts ./scripts

# Data directory for SQLite
RUN mkdir -p /data && chown sanakenno:sanakenno /data
VOLUME /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
ENV TZ=Europe/Helsinki

USER sanakenno

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["pnpm", "exec", "tsx", "server/index.ts"]
