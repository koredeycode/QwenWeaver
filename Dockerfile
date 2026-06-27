# =============================================================================
# Stage 1: Build all packages
# =============================================================================
FROM node:22-alpine AS builder

RUN npm install -g pnpm@latest

WORKDIR /build

# Install native build deps
RUN apk add --no-cache python3 make g++

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./

# Copy package manifests for all workspaces
COPY apps/api/package.json apps/api/
COPY apps/app/package.json apps/app/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY packages/encryption/package.json packages/encryption/
COPY packages/mcp-client/package.json packages/mcp-client/
COPY packages/cli/package.json packages/cli/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ apps/api/
COPY apps/app/ apps/app/
COPY packages/types/ packages/types/
COPY packages/database/ packages/database/
COPY packages/encryption/ packages/encryption/
COPY packages/mcp-client/ packages/mcp-client/
COPY packages/cli/ packages/cli/

# Build everything
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod --config.confirmModulesPurge=false

# =============================================================================
# Stage 2: Runtime image
# =============================================================================
FROM node:22-alpine

RUN npm install -g pnpm@latest && \
    apk add --no-cache tini

WORKDIR /app

# Copy built artifacts and production node_modules
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /build/packages ./packages
COPY --from=builder /build/apps/api/dist ./apps/api/dist
COPY --from=builder /build/apps/app/dist ./apps/app/dist

# Copy static assets for the API
COPY --from=builder /build/apps/api/package.json ./apps/api/
COPY --from=builder /build/apps/api/src/public/ ./apps/api/src/public/

# Copy CLI binary
COPY --from=builder /build/packages/cli/dist ./packages/cli/dist
COPY --from=builder /build/packages/cli/package.json ./packages/cli/

# Expose default port
EXPOSE 3001

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3001

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Default: start the API server
CMD ["node", "apps/api/dist/index.js"]
