# JobTrackr backend — Express API.
#
# Single-stage build: `npm ci` installs full dependencies (including the
# `prisma` devDependency), not just production ones. This is a deliberate
# deviation from "production dependencies only" — the `prisma` CLI is
# required both by the `postinstall` hook (`prisma generate`) below and at
# container startup (`prisma migrate deploy`, run via docker-compose's
# `command:`, since migrations need a live DB connection that only exists
# at runtime, not at build time). Stripping devDependencies would require a
# multi-stage copy of node_modules for no real benefit in a local demo
# image, so the simpler single-stage build is used instead.
FROM node:22-alpine

WORKDIR /app

# Copied before `npm ci` so the `postinstall` hook's `prisma generate` can
# find the schema, and so this layer is cached unless deps/schema change.
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# Rest of the source. `.dockerignore` excludes node_modules/.env/.git so
# this never overwrites the node_modules installed above and never bakes
# any local secret into the image.
COPY . .

ENV NODE_ENV=production

# Documentation only — the real listening port is env.PORT (see
# docker-compose.yml), not hardcoded here.
EXPOSE 3000

CMD ["node", "src/server.js"]
