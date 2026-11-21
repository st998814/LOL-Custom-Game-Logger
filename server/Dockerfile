# Shared production image for API (`npm start`) and worker (`npm run worker`).
# Build: docker build -t lol-ledger-server:local ./server
#
# Runtime keeps `tsx` + Prisma CLI: this app runs TypeScript via tsx and needs
# `prisma` for one-shot `migrate deploy` / client tooling. Do not use
# `npm ci --omit=dev` alone.

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

# prisma.config.ts requires DIRECT_URL at generate time; no live DB needed.
ENV DIRECT_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN npx prisma generate

# Drop test-only tooling; keep tsx + prisma for runtime and migrate jobs.
RUN npm uninstall vitest supertest @types/supertest nodemon ts-node \
  && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=7871

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin appuser \
  && chown -R appuser:appuser /app
USER appuser

EXPOSE 7871

# Override in Compose for the worker: npm run worker
CMD ["npm", "start"]
