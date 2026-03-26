# --- Build stage ---
FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime

RUN apk add --no-cache python3 make g++ tzdata

RUN addgroup -S sanakenno && adduser -S sanakenno -G sanakenno

WORKDIR /app

# Copy production dependencies (argon2 needs native compilation)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force && apk del python3 make g++

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server source and admin scripts (executed via tsx at runtime)
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

CMD ["npx", "tsx", "server/index.ts"]
