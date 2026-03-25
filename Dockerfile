# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime

RUN addgroup -S sanakenno && adduser -S sanakenno -G sanakenno

WORKDIR /app

# Copy production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server source (executed via tsx at runtime)
COPY server ./server

# Data directory for SQLite
RUN mkdir -p /data && chown sanakenno:sanakenno /data
VOLUME /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

USER sanakenno

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
