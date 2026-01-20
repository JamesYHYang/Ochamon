FROM node:20-slim AS builder

WORKDIR /app

# Enable and pin pnpm version
RUN corepack enable
RUN corepack prepare pnpm@10.28.1 --activate

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy ALL source files first
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build shared package
RUN pnpm --filter @matcha/shared build

# Generate Prisma client
RUN pnpm --filter @matcha/api exec prisma generate

# Build API
RUN pnpm --filter @matcha/api build

# Production stage
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/api

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/shared /app/packages/shared

EXPOSE 3001

# Correct path: dist/src/main.js
CMD ["node", "dist/src/main.js"]
