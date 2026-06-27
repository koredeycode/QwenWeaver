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


# =============================================================================
# Stage 2: Runtime image
# =============================================================================
FROM node:22-alpine AS runner

RUN npm install -g pnpm@latest && \
    apk add --no-cache tini

WORKDIR /app

# Copy workspace config and package manifests for production install
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY packages/encryption/package.json packages/encryption/
COPY packages/mcp-client/package.json packages/mcp-client/
COPY packages/cli/package.json packages/cli/

# Copy the pnpm store from builder to speed up install
COPY --from=builder /build/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder /build/node_modules/.modules.yaml /app/node_modules/.modules.yaml

# Install only production deps — creates all symlinks correctly
RUN pnpm install --prod --frozen-lockfile --config.confirmModulesPurge=false

# Copy built artifacts
COPY --from=builder /build/packages ./packages
COPY --from=builder /build/apps/api/dist ./apps/api/dist
COPY --from=builder /build/apps/app/dist ./apps/app/dist

# Create public storage directory for runtime outputs
RUN mkdir -p /app/public/storage/runs

# Copy static assets for the API
COPY --from=builder /build/apps/api/src/public/ /app/public/

# Copy CLI binary
COPY --from=builder /build/packages/cli/dist ./packages/cli/dist

# Expose default port
EXPOSE 3001

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3001

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Default: start the API server
CMD ["node", "apps/api/dist/index.js"]
